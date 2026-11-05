const express = require('express');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

// function createApp() {
//   const app = express();
//   app.disable('x-powered-by');

//   // Order matters: id first (so everything can log it), then logging, then body parsing.
//   app.use(requestId);
//   app.use(requestLogger);
//   app.use(express.json({ limit: '100kb' }));

//   app.use(routes);

//   // These two MUST come last: unknown routes, then the error handler.
//   app.use(notFound);
//   app.use(errorHandler);
//   return app;
// }

// module.exports = createApp;






























function createApp(){
  const app = express()
  app.disabled('x-powered-by')

  app.use(express.json({limit: '100kb' }))

  app.use(requestId)
  app.use(requestLogger)

  app.use(routes)

  app.use(notFound)
  app.use(errorHandler)
  return app

}

module.exports = createApp
