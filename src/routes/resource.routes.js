const express = require('express');
const validate = require('../middleware/validate');
const requireApiKey = require('../middleware/auth');
const {
  createResourceSchema,
  updateResourceSchema,
  listQuerySchema,
  idParamSchema,
} = require('../validators/resource.schema');
const controller = require('../controllers/resource.controller');

const router = express.Router();

// Reads are public.
router.get('/', validate({ query: listQuerySchema }), controller.list);
router.get('/:id', validate({ params: idParamSchema }), controller.getOne);

// FEATURE 4: every write needs the API key. Auth runs BEFORE validation, so an
// unauthenticated caller learns nothing about our validation rules.
router.post('/', requireApiKey, validate({ body: createResourceSchema }), controller.create);
router.patch('/:id', requireApiKey, validate({ params: idParamSchema, body: updateResourceSchema }), controller.update);
router.delete('/:id', requireApiKey, validate({ params: idParamSchema }), controller.remove);

module.exports = router;
