// const logger = require('../lib/logger');

// module.exports = function requestLogger(req, res, next) {
//   const start = process.hrtime.bigint();
//   res.on('finish', () => {
//     const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
//     logger.info('request', {
//       requestId: req.id,
//       method: req.method,
//       path: req.originalUrl.split('?')[0],
//       status: res.statusCode,
//       durationMs: Math.round(durationMs * 10) / 10,
//     });
//   });
//   next();
// };




























const logger = require('../lib/logger');

module.exports = function requestLogger(req, res, next){
  const start = process.hrtime.bigint()
  res.on('finish' ()=>{
    const durationMs = Number(process.hrtime.bigint() - start / le6)
    logger.info('request', {
      
    })
  })
}
