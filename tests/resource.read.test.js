const request = require('supertest');
const createApp = require('../src/app');
const Resource = require('../src/models/Resource');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const { buildResource } = require('./helpers/factories');

const app = createApp();

// Insert straight into the database so tests control every field (including timestamps).
async function seed(overrides = {}) {
  const base = buildResource(overrides);
  return Resource.create({ availableCopies: base.totalCopies, ...base, ...overrides });
}

beforeAll(() => startDb([Resource]));
beforeEach(() => clearDb([Resource]));
afterAll(() => stopDb());

describe('GET /resources/:id (Feature 2: read one)', () => {
  test('returns the resource', async () => {
    const r = await seed({ title: 'Clean Code' });
    const res = await request(app).get(`/resources/${r.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Clean Code');
    expect(res.body.data.id).toBe(r.id);
  });

  test('valid but unknown id -> 404 RESOURCE_NOT_FOUND', async () => {
    const res = await request(app).get('/resources/64b7f0f0f0f0f0f0f0f0f0f0');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  test('malformed id -> 400, never 500', async () => {
    const res = await request(app).get('/resources/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /resources (Feature 2: list, filter, sort, paginate)', () => {
  test('returns data with pagination meta', async () => {
    for (let i = 0; i < 25; i++) await seed();
    const res = await request(app).get('/resources');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 25, totalPages: 2 });
    const page2 = await request(app).get('/resources?page=2');
    expect(page2.body.data).toHaveLength(5);
  });

  test('limit above the cap is rejected (no unbounded lists)', async () => {
    const res = await request(app).get('/resources?limit=1000000');
    expect(res.status).toBe(400);
  });

  test.each(['page=0', 'page=-1', 'limit=0', 'page=abc', 'sort=password', 'status=deleted'])(
    'bad parameter %s -> 400',
    async (qs) => {
      expect((await request(app).get(`/resources?${qs}`)).status).toBe(400);
    },
  );

  test('filters by category and tag', async () => {
    await seed({ category: 'science', tags: ['physics'] });
    await seed({ category: 'science', tags: ['chemistry'] });
    await seed({ category: 'history', tags: ['physics'] });
    const byCat = await request(app).get('/resources?category=science');
    expect(byCat.body.meta.total).toBe(2);
    const byTag = await request(app).get('/resources?tag=physics');
    expect(byTag.body.meta.total).toBe(2);
    const both = await request(app).get('/resources?category=science&tag=physics');
    expect(both.body.meta.total).toBe(1);
  });

  test('filters by availability', async () => {
    await seed({ totalCopies: 2, availableCopies: 2 });
    await seed({ totalCopies: 2, availableCopies: 0 });
    expect((await request(app).get('/resources?available=true')).body.meta.total).toBe(1);
    expect((await request(app).get('/resources?available=false')).body.meta.total).toBe(1);
  });

  test('search q matches title or author, case-insensitively', async () => {
    await seed({ title: 'Designing Data-Intensive Applications', author: 'Kleppmann' });
    await seed({ title: 'Other', author: 'Martin Kleppmann' });
    await seed({ title: 'Unrelated', author: 'Someone' });
    const res = await request(app).get('/resources?q=kLEPP');
    expect(res.body.meta.total).toBe(2);
  });

  test('regex metacharacters in q are treated literally (no 500, no regex injection)', async () => {
    await seed({ title: 'C++ Primer' });
    const paren = await request(app).get('/resources?q=(');
    expect(paren.status).toBe(200);
    const dotstar = await request(app).get('/resources?q=.*');
    expect(dotstar.status).toBe(200);
    expect(dotstar.body.meta.total).toBe(0); // ".*" is NOT a wildcard
    const cpp = await request(app).get('/resources?q=' + encodeURIComponent('C++'));
    expect(cpp.body.meta.total).toBe(1);
  });

  test('sorts by title ascending and descending', async () => {
    await seed({ title: 'B' });
    await seed({ title: 'A' });
    await seed({ title: 'C' });
    const asc = await request(app).get('/resources?sort=title');
    expect(asc.body.data.map((d) => d.title)).toEqual(['A', 'B', 'C']);
    const desc = await request(app).get('/resources?sort=-title');
    expect(desc.body.data.map((d) => d.title)).toEqual(['C', 'B', 'A']);
  });

  test('archived resources are hidden by default, visible with status=archived', async () => {
    await seed({ status: 'archived' });
    await seed();
    expect((await request(app).get('/resources')).body.meta.total).toBe(1);
    expect((await request(app).get('/resources?status=archived')).body.meta.total).toBe(1);
  });

  test('pagination is stable when many documents share the same sort value', async () => {
    const sameTime = new Date('2026-01-01T00:00:00Z');
    await Resource.collection.insertMany(
      Array.from({ length: 5 }, (_, i) => ({
        ...buildResource({ title: `Same ${i}` }),
        availableCopies: 3,
        status: 'active',
        createdAt: sameTime,
        updatedAt: sameTime,
      })),
    );
    const ids = [];
    for (const page of [1, 2, 3]) {
      const res = await request(app).get(`/resources?limit=2&page=${page}`);
      ids.push(...res.body.data.map((d) => d.id));
    }
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5); // no duplicates, nothing skipped
  });

  test('query-operator style input is rejected, not executed', async () => {
    const res = await request(app).get('/resources?category[$ne]=science');
    expect(res.status).toBe(400);
  });
});
