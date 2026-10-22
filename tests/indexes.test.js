const Resource = require('../src/models/Resource');
const Loan = require('../src/models/Loan');
const { startDb, stopDb } = require('./helpers/db');

beforeAll(() => startDb([Resource, Loan]));
afterAll(() => stopDb());

const hasIndex = (indexes, key, unique = false) =>
  indexes.some((i) => JSON.stringify(i.key) === JSON.stringify(key) && Boolean(i.unique) === unique);

// Index design is part of the contract: if someone deletes one, a test should notice.
describe('index design (INDEX IMPACT of each feature)', () => {
  test('resources: unique isbn + the two list-query indexes', async () => {
    const idx = await Resource.collection.indexes();
    expect(hasIndex(idx, { isbn: 1 }, true)).toBe(true);
    expect(hasIndex(idx, { status: 1, createdAt: -1 })).toBe(true);
    expect(hasIndex(idx, { status: 1, category: 1, createdAt: -1 })).toBe(true);
  });

  test('loans: per-resource history and per-borrower lookups', async () => {
    const idx = await Loan.collection.indexes();
    expect(hasIndex(idx, { resourceId: 1, borrowedAt: -1 })).toBe(true);
    expect(hasIndex(idx, { borrowerEmail: 1, status: 1 })).toBe(true);
  });
});
