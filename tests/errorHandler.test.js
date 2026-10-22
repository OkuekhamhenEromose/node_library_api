const errorHandler = require('../src/middleware/errorHandler');
const AppError = require('../src/lib/AppError');

// Unit test: call the error handler directly with different error shapes.
function run(err) {
  const res = {
    headersSent: false,
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
  errorHandler(err, { id: 'req-1' }, res, () => {});
  return res;
}

describe('errorHandler classification', () => {
  test('AppError keeps its status and code', () => {
    const res = run(new AppError(409, 'CONFLICT', 'nope'));
    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('Mongoose CastError -> 400 (safety net)', () => {
    const err = Object.assign(new Error('cast'), { name: 'CastError', path: '_id' });
    const res = run(err);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('unexpected error -> generic 500 that leaks nothing', () => {
    const res = run(new TypeError("Cannot read properties of undefined (reading 'secret')"));
    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).toBe('Something went wrong');
    expect(JSON.stringify(res.body)).not.toMatch(/secret|TypeError|stack/);
  });

  test('every error response carries the request id', () => {
    expect(run(new Error('x')).body.error.requestId).toBe('req-1');
  });
});
