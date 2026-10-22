const createApp = require('../src/app');
const Resource = require('../src/models/Resource');
const Loan = require('../src/models/Loan');
const { findDrift, fixDrift } = require('../src/services/reconcile.service');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const { buildResource } = require('./helpers/factories');
const authed = require('./helpers/auth');

const app = createApp();
const api = authed(app);
const who = (i) => ({ borrowerName: `P${i}`, borrowerEmail: `p${i}@example.com` });

beforeAll(() => startDb([Resource, Loan]));
beforeEach(() => clearDb([Resource, Loan]));
afterEach(() => jest.restoreAllMocks());
afterAll(() => stopDb());

describe('failure behaviour of two-step operations', () => {
  test('if recording the loan fails, the claimed copy is given back (compensation)', async () => {
    const base = buildResource({ totalCopies: 2 });
    const r = await Resource.create({ ...base, availableCopies: 2 });
    jest.spyOn(Loan, 'create').mockRejectedValueOnce(new Error('simulated database failure'));

    const res = await api.post(`/resources/${r.id}/loans`).send(who(1));

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('Something went wrong'); // nothing leaked
    expect((await Resource.findById(r.id)).availableCopies).toBe(2); // copy restored
    expect(await Loan.countDocuments()).toBe(0);
  });

  test('reconcile finds drift and repairs it', async () => {
    const base = buildResource({ totalCopies: 3 });
    const r = await Resource.create({ ...base, availableCopies: 3 });
    await api.post(`/resources/${r.id}/loans`).send(who(1)).expect(201);
    await Resource.updateOne({ _id: r.id }, { $set: { availableCopies: 3 } }); // simulate a crash that lost a decrement

    const drift = await findDrift();
    expect(drift).toEqual([{ resourceId: r.id, actual: 3, expected: 2 }]);

    await fixDrift();
    expect(await findDrift()).toEqual([]);
    expect((await Resource.findById(r.id)).availableCopies).toBe(2);
  });

  test('no drift in a consistent database', async () => {
    const base = buildResource({ totalCopies: 3 });
    const r = await Resource.create({ ...base, availableCopies: 3 });
    await api.post(`/resources/${r.id}/loans`).send(who(1));
    expect(await findDrift()).toEqual([]);
  });
});
