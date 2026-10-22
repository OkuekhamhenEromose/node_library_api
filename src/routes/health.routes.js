const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Liveness: the process is up. Cheap, no dependencies.
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Readiness: can this instance serve traffic? (database connected)
router.get('/ready', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({ status: dbReady ? 'ready' : 'not_ready', db: dbReady });
});

module.exports = router;
