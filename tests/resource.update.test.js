const request = require('supertest');
const createApp = require('../src/app');
const Resource = require('../src/models/Resource');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const { buildResource } = require('./helpers/factories');
const authed = require('./helpers/auth');

const app = createApp();
const api = authed(app); // write calls carry the API key
const seed = (o = {}) => {
  const base = buildResource(o);
  return Resource.create({ availableCopies: base.totalCopies, ...base, ...o });
};

beforeAll(() => startDb([Resource]));
beforeEach(() => clearDb([Resource]));
afterAll(() => stopDb());

describe('PATCH /resources/:id (Feature 3: update)', () => {
  test('updates only the provided fields', async () => {
    const r = await seed({ title: 'Old', author: 'Keep Me', tags: ['a', 'b'] });
    const res = await api.patch(`/resources/${r.id}`).send({ title: 'New' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: 'New', author: 'Keep Me', tags: ['a', 'b'] });
  });

  test('isbn is immutable; status/availableCopies are not client-writable', async () => {
    const r = await seed();
    for (const body of [{ isbn: '9780000000999' }, { status: 'archived' }, { availableCopies: 99 }]) {
      const res = await api.patch(`/resources/${r.id}`).send(body);
      expect(res.status).toBe(400);
    }
  });

  test('empty patch -> 400', async () => {
    const r = await seed();
    expect((await api.patch(`/resources/${r.id}`).send({})).status).toBe(400);
  });

  test('unknown id -> 404, malformed id -> 400', async () => {
    expect((await api.patch('/resources/64b7f0f0f0f0f0f0f0f0f0f0').send({ title: 'x' })).status).toBe(404);
    expect((await api.patch('/resources/xyz').send({ title: 'x' })).status).toBe(400);
  });

  test('archived resources cannot be modified -> 409', async () => {
    const r = await seed({ status: 'archived' });
    const res = await api.patch(`/resources/${r.id}`).send({ title: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RESOURCE_ARCHIVED');
  });

  test('increasing totalCopies increases availableCopies by the same amount', async () => {
    const r = await seed({ totalCopies: 3, availableCopies: 1 }); // 2 on loan
    const res = await api.patch(`/resources/${r.id}`).send({ totalCopies: 5 });
    expect(res.body.data).toMatchObject({ totalCopies: 5, availableCopies: 3 });
  });

  test('decreasing totalCopies down to the number on loan is allowed', async () => {
    const r = await seed({ totalCopies: 3, availableCopies: 1 }); // 2 on loan
    const res = await api.patch(`/resources/${r.id}`).send({ totalCopies: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ totalCopies: 2, availableCopies: 0 });
  });

  test('decreasing totalCopies below the number on loan -> 422', async () => {
    const r = await seed({ totalCopies: 3, availableCopies: 1 }); // 2 on loan
    const res = await api.patch(`/resources/${r.id}`).send({ totalCopies: 1 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BELOW_COPIES_ON_LOAN');
    const unchanged = await Resource.findById(r.id);
    expect(unchanged.totalCopies).toBe(3);
  });
});

describe('DELETE /resources/:id (Feature 3: archive)', () => {
  test('archives instead of deleting: 204, document remains, hidden from default list', async () => {
    const r = await seed();
    const res = await api.delete(`/resources/${r.id}`);
    expect(res.status).toBe(204);
    expect(await Resource.countDocuments()).toBe(1);
    expect((await request(app).get(`/resources/${r.id}`)).body.data.status).toBe('archived');
    expect((await request(app).get('/resources')).body.meta.total).toBe(0);
  });

  test('is idempotent: deleting twice is 204 both times', async () => {
    const r = await seed();
    expect((await api.delete(`/resources/${r.id}`)).status).toBe(204);
    expect((await api.delete(`/resources/${r.id}`)).status).toBe(204);
  });

  test('refuses to archive while copies are on loan -> 409 HAS_ACTIVE_LOANS', async () => {
    const r = await seed({ totalCopies: 2, availableCopies: 1 });
    const res = await api.delete(`/resources/${r.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HAS_ACTIVE_LOANS');
    expect((await Resource.findById(r.id)).status).toBe('active');
  });

  test('unknown id -> 404', async () => {
    expect((await api.delete('/resources/64b7f0f0f0f0f0f0f0f0f0f0')).status).toBe(404);
  });
});
