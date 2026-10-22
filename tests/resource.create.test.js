const createApp = require('../src/app');
const Resource = require('../src/models/Resource');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const { buildResource } = require('./helpers/factories');
const authed = require('./helpers/auth');

const app = createApp();
const api = authed(app); // write calls carry the API key

beforeAll(() => startDb([Resource]));
beforeEach(() => clearDb([Resource]));
afterAll(() => stopDb());

describe('POST /resources (Feature 1: create)', () => {
  test('creates a resource: 201, Location header, shaped output', async () => {
    const res = await api.post('/resources').send(buildResource({ totalCopies: 4 }));
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/resources/${res.body.data.id}`);
    expect(res.body.data).toMatchObject({ totalCopies: 4, availableCopies: 4, status: 'active' });
    expect(res.body.data._id).toBeUndefined(); // internal field not leaked
    expect(res.body.data.__v).toBeUndefined();
  });

  test('persists exactly one document', async () => {
    await api.post('/resources').send(buildResource());
    expect(await Resource.countDocuments()).toBe(1);
  });

  test('normalises ISBN (hyphens removed) and defaults tags', async () => {
    const body = buildResource({ isbn: '978-0-13-468599-1' });
    delete body.tags;
    const res = await api.post('/resources').send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.isbn).toBe('9780134685991');
    expect(res.body.data.tags).toEqual([]);
  });

  test('duplicate ISBN -> 409 DUPLICATE_RESOURCE (database unique index)', async () => {
    const body = buildResource();
    await api.post('/resources').send(body).expect(201);
    const res = await api.post('/resources').send({ ...body, title: 'Other title' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_RESOURCE');
    expect(res.body.error.message).toMatch(/isbn/);
    expect(await Resource.countDocuments()).toBe(1);
  });

  test('the unique index really exists in the database', async () => {
    const indexes = await Resource.collection.indexes();
    const isbnIdx = indexes.find((i) => i.key && i.key.isbn === 1);
    expect(isbnIdx).toBeDefined();
    expect(isbnIdx.unique).toBe(true);
  });

  test.each([
    ['missing title', { title: undefined }],
    ['empty title', { title: '   ' }],
    ['bad isbn', { isbn: '12345' }],
    ['unknown category', { category: 'cooking' }],
    ['zero copies', { totalCopies: 0 }],
    ['copies as string', { totalCopies: '5' }],
    ['too many tags', { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }],
  ])('validation: %s -> 400 VALIDATION_ERROR', async (_name, override) => {
    const res = await api.post('/resources').send(buildResource(override));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
    expect(await Resource.countDocuments()).toBe(0);
  });

  test('mass assignment: client cannot set availableCopies/status/id', async () => {
    const res = await api
      .post('/resources')
      .send(buildResource({ availableCopies: 999, status: 'archived', _id: 'abc' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('empty body -> 400', async () => {
    const res = await api.post('/resources').send({});
    expect(res.status).toBe(400);
  });
});
