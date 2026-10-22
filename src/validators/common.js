const { z } = require('zod');

// REFACTOR: these two pieces were copy-pasted in resource.schema.js and loan.schema.js.
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a 24-character hex id');

// Spread into any list-query schema:  z.strictObject({ ...pageParams, ... })
const pageParams = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20), // hard cap: no unbounded lists
};

module.exports = { objectId, pageParams };
