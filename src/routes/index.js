// const express = require('express');
// const health = require('./health.routes');
// const resources = require('./resource.routes');
// const loans = require('./loan.routes');

// const router = express.Router();

// router.use(health);
// router.use('/resources', resources);
// router.use(loans); // declares its own absolute paths: /resources/:id/loans and /loans/...

// module.exports = router;
































const express = require('express')
const health = require('./health.routes')

const router = express.Router()

router.use(health)

module.exports = router
