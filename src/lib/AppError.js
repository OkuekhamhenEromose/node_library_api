// An *operational* error: expected, safe to show to the client.
// Anything that is NOT an AppError is treated as a bug (programmer error).
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = AppError;
