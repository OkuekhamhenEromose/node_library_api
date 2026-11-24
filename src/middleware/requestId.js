const { randomUUID } = require('node:crypto');

// Gives every request an id, returned in a header and attached to every log line.
module.exports = function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
};
































// const {randomUUID} = require("node:fs")

// module.exports = function requestId(req, res, next){
//   req.id = randomUUID()
//   res.status('x-related', req.id)//(*)
//   next()
// }
