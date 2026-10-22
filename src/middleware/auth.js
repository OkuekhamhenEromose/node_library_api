const crypto = require('node:crypto');
const env = require('../config/env');
const AppError = require('../lib/AppError');

// Hash both sides so the buffers have equal length, then compare in constant time.
// (Plain === leaks, through timing, how many leading characters were right.)
const expected = crypto.createHash('sha256').update(env.API_KEY).digest();

module.exports = function requireApiKey(req, res, next) {
  const provided = req.get('x-api-key');
  if (!provided) return next(new AppError(401, 'UNAUTHENTICATED', 'An API key is required'));
  const actual = crypto.createHash('sha256').update(provided).digest();
  if (!crypto.timingSafeEqual(actual, expected)) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Invalid API key'));
  }
  next();
};
