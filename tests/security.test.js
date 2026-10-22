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

beforeAll(() => startDb([Resource, Loan]));
beforeEach(() => clearDb([Resource, Loan]));
afterAll(() => stopDb());

// Each test: VULNERABILITY -> exploit attempt -> expected defence (kept as regression protection).
describe('security regression tests', () => {
  test('NoSQL injection in a JSON body: operator objects are rejected, nothing stored', async () => {
    const res = await api.post('/resources').send(buildResource({ title: { $gt: '' } }));
    expect(res.status).toBe(400);
    expect(await Resource.countDocuments()).toBe(0);
  });

  test('NoSQL injection in query strings: operator-style keys are rejected', async () => {
    await request(app).get('/resources?category[$ne]=x').expect(400);
    await request(app).get('/resources?status[$ne]=archived').expect(400);
    await request(app).get('/loans?borrowerEmail[$ne]=x').set('x-api-key', KEY).expect(400);
  });

  test('regex injection via q is neutralised (literal match only)', async () => {
    await Resource.create({ ...buildResource({ title: 'Plain Title' }), availableCopies: 3 });
    const res = await request(app).get('/resources?q=' + encodeURIComponent('.*'));
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(0);
  });

  test('oversized body -> 413, not memory exhaustion', async () => {
    const res = await api.post('/resources').send(buildResource({ title: 'x'.repeat(200_000) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  test('IDOR note: this API has ONE role, so there is no per-user ownership to bypass (see NodeVol 6)', async () => {
    // Documenting a deliberate limit: all keyed callers are equally trusted staff.
    const r = await api.post('/resources').send(buildResource());
    expect(r.status).toBe(201);
  });

  test('responses never expose internal fields', async () => {
    const created = (await api.post('/resources').send(buildResource())).body.data;
    const read = (await request(app).get(`/resources/${created.id}`)).body.data;
    const list = (await request(app).get('/resources')).body.data[0];
    for (const doc of [created, read, list]) {
      expect(doc._id).toBeUndefined();
      expect(doc.__v).toBeUndefined();
    }
  });

  test('error responses carry a request id but no stack traces or file paths', async () => {
    const res = await request(app).get('/resources/xyz');
    const text = JSON.stringify(res.body);
    expect(res.body.error.requestId).toBeDefined();
    expect(text).not.toMatch(/node_modules|\.js:\d+|at .*\(/);
  });

  test('the API key is compared by value, not by prefix or case', async () => {
    // (Leading/trailing spaces are not tested: HTTP strips whitespace around header values.)
    const wrong = [KEY.toUpperCase(), KEY.slice(0, -1), KEY + 'x'];
    for (const k of wrong) {
      const res = await request(app).post('/resources').set('x-api-key', k).send(buildResource());
      expect(res.status).toBe(401);
    }
  });
});
