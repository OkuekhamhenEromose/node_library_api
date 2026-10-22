const request = require('supertest');
const createApp = require('../src/app');
const Resource = require('../src/models/Resource');
const Loan = require('../src/models/Loan');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const { buildResource } = require('./helpers/factories');
const authed = require('./helpers/auth');

const app = createApp();
const api = authed(app);
const KEY = process.env.API_KEY;
const get = (url) => request(app).get(url).set('x-api-key', KEY);

const person = (n = 1) => ({ borrowerName: `Person ${n}`, borrowerEmail: `person${n}@example.com` });
async function seedResource(o = {}) {
  const base = buildResource(o);
  return Resource.create({ availableCopies: base.totalCopies, ...base, ...o });
}

beforeAll(() => startDb([Resource, Loan]));
beforeEach(() => clearDb([Resource, Loan]));
afterAll(() => stopDb());

describe('POST /resources/:id/loans (Feature 5: borrow)', () => {
  test('creates a loan, decrements availability, sets a 14-day due date', async () => {
    const r = await seedResource({ totalCopies: 2 });
    const res = await api.post(`/resources/${r.id}/loans`).send(person());
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/loans/${res.body.data.id}`);
    const loan = res.body.data;
    expect(loan).toMatchObject({ status: 'active', returnedAt: null, borrowerEmail: 'person1@example.com' });
    const days = (new Date(loan.dueAt) - new Date(loan.borrowedAt)) / 86400000;
    expect(days).toBeCloseTo(14, 5);
    expect((await Resource.findById(r.id)).availableCopies).toBe(1);
  });

  test('normalises borrower email to lowercase', async () => {
    const r = await seedResource();
    const res = await api.post(`/resources/${r.id}/loans`).send({ borrowerName: 'A', borrowerEmail: '  Mixed@Example.COM ' });
    expect(res.body.data.borrowerEmail).toBe('mixed@example.com');
  });

  test('no copies left -> 409 NO_COPIES_AVAILABLE', async () => {
    const r = await seedResource({ totalCopies: 1, availableCopies: 0 });
    const res = await api.post(`/resources/${r.id}/loans`).send(person());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NO_COPIES_AVAILABLE');
    expect(await Loan.countDocuments()).toBe(0);
  });

  test('archived resource -> 409 RESOURCE_ARCHIVED', async () => {
    const r = await seedResource({ status: 'archived' });
    const res = await api.post(`/resources/${r.id}/loans`).send(person());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RESOURCE_ARCHIVED');
  });

  test('unknown resource -> 404; malformed id -> 400; bad body -> 400', async () => {
    expect((await api.post('/resources/64b7f0f0f0f0f0f0f0f0f0f0/loans').send(person())).status).toBe(404);
    expect((await api.post('/resources/zzz/loans').send(person())).status).toBe(400);
    const r = await seedResource();
    expect((await api.post(`/resources/${r.id}/loans`).send({ borrowerName: 'x', borrowerEmail: 'not-an-email' })).status).toBe(400);
    expect((await api.post(`/resources/${r.id}/loans`).send({ ...person(), status: 'returned' })).status).toBe(400);
  });

  test('a borrower may hold at most 3 active loans -> 422 on the 4th', async () => {
    const r = await seedResource({ totalCopies: 10 });
    for (let i = 0; i < 3; i++) expect((await api.post(`/resources/${r.id}/loans`).send(person())).status).toBe(201);
    const res = await api.post(`/resources/${r.id}/loans`).send(person());
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('LOAN_LIMIT_REACHED');
    expect((await Resource.findById(r.id)).availableCopies).toBe(7);
  });

  test('requires the API key (loans contain personal data)', async () => {
    const r = await seedResource();
    expect((await request(app).post(`/resources/${r.id}/loans`).send(person())).status).toBe(401);
    expect((await request(app).get('/loans')).status).toBe(401);
  });
});

describe('POST /loans/:id/return (Feature 5: return)', () => {
  async function borrowOne(r, n = 1) {
    return (await api.post(`/resources/${r.id}/loans`).send(person(n))).body.data;
  }

  test('marks the loan returned and restores availability', async () => {
    const r = await seedResource({ totalCopies: 1 });
    const loan = await borrowOne(r);
    const res = await api.post(`/loans/${loan.id}/return`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('returned');
    expect(res.body.data.returnedAt).not.toBeNull();
    expect((await Resource.findById(r.id)).availableCopies).toBe(1);
  });

  test('returning twice -> 409 ALREADY_RETURNED and availability is restored only once', async () => {
    const r = await seedResource({ totalCopies: 2 });
    const loan = await borrowOne(r);
    await api.post(`/loans/${loan.id}/return`).expect(200);
    const second = await api.post(`/loans/${loan.id}/return`);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_RETURNED');
    expect((await Resource.findById(r.id)).availableCopies).toBe(2);
  });

  test('unknown loan -> 404; malformed id -> 400', async () => {
    expect((await api.post('/loans/64b7f0f0f0f0f0f0f0f0f0f0/return')).status).toBe(404);
    expect((await api.post('/loans/nope/return')).status).toBe(400);
  });
});

describe('listing loans and interplay with earlier features', () => {
  test('GET /loans filters by status and borrower; GET /resources/:id/loans scopes to a resource', async () => {
    const a = await seedResource({ totalCopies: 5 });
    const b = await seedResource({ totalCopies: 5 });
    const l1 = (await api.post(`/resources/${a.id}/loans`).send(person(1))).body.data;
    await api.post(`/resources/${a.id}/loans`).send(person(2));
    await api.post(`/resources/${b.id}/loans`).send(person(1));
    await api.post(`/loans/${l1.id}/return`);
    expect((await get('/loans?status=active')).body.meta.total).toBe(2);
    expect((await get('/loans?borrowerEmail=person1@example.com')).body.meta.total).toBe(2);
    expect((await get(`/resources/${a.id}/loans`)).body.meta.total).toBe(2);
    expect((await get(`/loans/${l1.id}`)).body.data.status).toBe('returned');
  });

  test('a resource with a loan out cannot be archived; after return it can (Feature 3 + 5)', async () => {
    const r = await seedResource({ totalCopies: 2 });
    const loan = (await api.post(`/resources/${r.id}/loans`).send(person())).body.data;
    expect((await api.delete(`/resources/${r.id}`)).status).toBe(409);
    await api.post(`/loans/${loan.id}/return`);
    expect((await api.delete(`/resources/${r.id}`)).status).toBe(204);
  });

  test('totalCopies cannot drop below what is really on loan (Feature 3 + 5)', async () => {
    const r = await seedResource({ totalCopies: 3 });
    await api.post(`/resources/${r.id}/loans`).send(person(1));
    await api.post(`/resources/${r.id}/loans`).send(person(2));
    expect((await api.patch(`/resources/${r.id}`).send({ totalCopies: 1 })).status).toBe(422);
    expect((await api.patch(`/resources/${r.id}`).send({ totalCopies: 2 })).status).toBe(200);
  });
});
