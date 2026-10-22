const request = require('supertest');
const createApp = require('../src/app');
const { startDb, stopDb, mongoose } = require('./helpers/db');
const { connectDb } = require('../src/config/db');
const env = require('../src/config/env');

const app = createApp();

beforeAll(() => startDb());
afterAll(() => stopDb());

describe('health and foundation behaviour', () => {
  test('GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-request-id']).toBeDefined();
  });

  test('GET /ready is 200 when MongoDB is connected', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe(true);
  });

  test('GET /ready is 503 when MongoDB is disconnected (failure test)', async () => {
    await mongoose.disconnect();
    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
    await connectDb(env.MONGODB_URI); // restore for the remaining tests
  });

  test('unknown route returns a JSON 404 with an error code', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  test('malformed JSON returns 400 INVALID_JSON, not 500', async () => {
    const res = await request(app).post('/health').set('Content-Type', 'application/json').send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  test('x-powered-by header is not exposed', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
