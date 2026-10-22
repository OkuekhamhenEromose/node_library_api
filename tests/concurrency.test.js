const request = require('supertest');
const createApp = require('../src/app');
const Resource = require('../src/models/Resource');
const Loan = require('../src/models/Loan');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const { buildResource } = require('./helpers/factories');
const authed = require('./helpers/auth');

const app = createApp();
const api = authed(app);
const who = (i) => ({ borrowerName: `P${i}`, borrowerEmail: `p${i}@example.com` });

beforeAll(() => startDb([Resource, Loan]));
beforeEach(() => clearDb([Resource, Loan]));
afterAll(() => stopDb());

describe('concurrency: the invariant is  0 <= availableCopies <= totalCopies  and  loans == copies out', () => {
  test('20 simultaneous borrows of a 3-copy resource: exactly 3 succeed', async () => {
    const base = buildResource({ totalCopies: 3 });
    const r = await Resource.create({ ...base, availableCopies: 3 });

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => api.post(`/resources/${r.id}/loans`).send(who(i))),
    );
    const statuses = results.map((x) => x.status);
    const ok = statuses.filter((s) => s === 201).length;
    const conflict = statuses.filter((s) => s === 409).length;

    const after = await Resource.findById(r.id);
    expect({ ok, conflict }).toEqual({ ok: 3, conflict: 17 });
    expect(after.availableCopies).toBe(0);
    expect(await Loan.countDocuments({ resourceId: r.id, status: 'active' })).toBe(3);
  });

  test('10 simultaneous returns of the SAME loan: exactly one succeeds, copies restored once', async () => {
    const base = buildResource({ totalCopies: 2 });
    const r = await Resource.create({ ...base, availableCopies: 2 });
    const loan = (await api.post(`/resources/${r.id}/loans`).send(who(1))).body.data;

    const results = await Promise.all(Array.from({ length: 10 }, () => api.post(`/loans/${loan.id}/return`)));
    const statuses = results.map((x) => x.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    expect((await Resource.findById(r.id)).availableCopies).toBe(2);
  });

  test('borrowing and returning at the same time never corrupts the counter', async () => {
    const base = buildResource({ totalCopies: 5 });
    const r = await Resource.create({ ...base, availableCopies: 5 });
    const held = [];
    for (let i = 0; i < 3; i++) held.push((await api.post(`/resources/${r.id}/loans`).send(who(100 + i))).body.data);

    await Promise.all([
      ...held.map((l) => api.post(`/loans/${l.id}/return`)),
      ...Array.from({ length: 4 }, (_, i) => api.post(`/resources/${r.id}/loans`).send(who(200 + i))),
    ]);

    const after = await Resource.findById(r.id);
    const activeLoans = await Loan.countDocuments({ resourceId: r.id, status: 'active' });
    expect(after.availableCopies + activeLoans).toBe(after.totalCopies); // the conservation law
    expect(after.availableCopies).toBeGreaterThanOrEqual(0);
  });
});
