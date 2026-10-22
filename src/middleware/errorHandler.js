const AppError = require('../lib/AppError');
const logger = require('../lib/logger');

// Express recognises error middleware by its four arguments. Keep all four.
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err.type === 'entity.parse.failed') {
    // express.json() could not parse the body
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  } else if (err.code === 11000) {
    // FEATURE 1: MongoDB duplicate-key error (unique index violated)
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    status = 409;
    code = 'DUPLICATE_RESOURCE';
    message = field ? `A record with this ${field} already exists` : 'A record with this value already exists';
  } else if (err.name === 'CastError') {
    // FEATURE 2 (fix): safety net. Route validation should catch bad ids first (defence in depth).
    status = 400;
    code = 'VALIDATION_ERROR';
    message = `Invalid value for ${err.path}`;
  } else if (err.name === 'ValidationError' && err.errors) {
    // Mongoose schema validation (the second line of defence behind zod)
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  }

  if (status >= 500) {
    // A bug or an infrastructure failure: log everything server-side, tell the client nothing.
    logger.error('unhandled error', { requestId: req.id, err: err.message, stack: err.stack });
  } else {
    logger.warn('request failed', { requestId: req.id, status, code });
  }

  res.status(status).json({ error: { code, message, details, requestId: req.id } });
};
