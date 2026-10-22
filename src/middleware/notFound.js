const AppError = require('../lib/AppError');

module.exports = function notFound(req, res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}`));
};
