const request = require('supertest');

const API_KEY = process.env.API_KEY;

// Wraps supertest so write calls carry the API key: authed.post('/resources').send(...)
module.exports = function authed(app) {
  return {
    post: (url) => request(app).post(url).set('x-api-key', API_KEY),
    patch: (url) => request(app).patch(url).set('x-api-key', API_KEY),
    delete: (url) => request(app).delete(url).set('x-api-key', API_KEY),
  };
};
module.exports.API_KEY = API_KEY;
