const { spawnSync } = require('node:child_process');
const path = require('node:path');
const request = require('supertest');
const createApp = require('../src/app');
const Resource = require('../src/models/Resource');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const { buildResource } = require('./helpers/factories');
const authed = require('./helpers/auth');

const app = createApp();

beforeAll(() => startDb([Resource]));
beforeEach(() => clearDb([Resource]));
afterAll(() => stopDb());

describe('API key authentication (Feature 4)', () => {
  test('writes without a key -> 401, nothing is created', async () => {
    const res = await request(app).post('/resources').send(buildResource());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(await Resource.countDocuments()).toBe(0);
  });

  test('writes with a wrong key -> 401', async () => {
    const res = await request(app).post('/resources').set('x-api-key', 'wrong-key-wrong-key').send(buildResource());
    expect(res.status).toBe(401);
  });

  test('a key of a different length is rejected cleanly (no exception)', async () => {
    const res = await request(app).post('/resources').set('x-api-key', 'x').send(buildResource());
    expect(res.status).toBe(401);
  });

  test('writes with the right key succeed', async () => {
    const res = await authed(app).post('/resources').send(buildResource());
    expect(res.status).toBe(201);
  });

  test('PATCH and DELETE are protected too', async () => {
    const r = await authed(app).post('/resources').send(buildResource()).then((x) => x.body.data);
    expect((await request(app).patch(`/resources/${r.id}`).send({ title: 'x' })).status).toBe(401);
    expect((await request(app).delete(`/resources/${r.id}`)).status).toBe(401);
  });

  test('auth runs before validation: an invalid body without a key is 401, not 400', async () => {
    const res = await request(app).post('/resources').send({});
    expect(res.status).toBe(401);
  });

  test('reads stay public', async () => {
    expect((await request(app).get('/resources')).status).toBe(200);
  });

  test('startup fails fast when API_KEY is missing or too short', () => {
    const root = path.join(__dirname, '..');
    const run = (extra) =>
      spawnSync(process.execPath, ['-e', "require('./src/config/env')"], {
        cwd: root,
        env: { PATH: process.env.PATH, MONGODB_URI: 'mongodb://x/y', ...extra },
        encoding: 'utf8',
      });
    const missing = run({});
    expect(missing.status).toBe(1);
    expect(missing.stderr).toMatch(/API_KEY/);
    const short = run({ API_KEY: 'short' });
    expect(short.status).toBe(1);
    expect(short.stderr).toMatch(/at least 16/);
    expect(run({ API_KEY: 'a-sufficiently-long-key' }).status).toBe(0);
  });
});
