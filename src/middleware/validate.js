const AppError = require('../lib/AppError');

// validate({ params, query, body }) -> parses each part with its zod schema.
// Parsed (typed, defaulted, trimmed) values go to req.valid.* ; handlers never read raw req.body.
// (Express 5 makes req.query read-only, so we cannot overwrite it anyway.)
module.exports = function validate(schemas) {
  return (req, res, next) => {
    const valid = {};
    const problems = [];
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) valid[part] = result.data;
      else
        problems.push(
          ...result.error.issues.map((i) => ({ in: part, path: i.path.join('.'), message: i.message })),
        );
    }
    if (problems.length) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', problems));
    }
    req.valid = valid;
    next();
  };
};
