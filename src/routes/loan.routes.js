const express = require('express');
const validate = require('../middleware/validate');
const requireApiKey = require('../middleware/auth');
const {
  resourceIdParamSchema,
  loanIdParamSchema,
  createLoanSchema,
  listLoansQuerySchema,
} = require('../validators/loan.schema');
const controller = require('../controllers/loan.controller');

const router = express.Router();

// Loan records contain personal data (borrower name + email), so EVERY loan route needs the key,
// including reads. The key is applied PER ROUTE: a pathless router.use(requireApiKey) would run for
// every request that reaches this router, including unknown URLs (it turned 404s into 401s; see Debugging).
const auth = requireApiKey;

router.post('/resources/:id/loans', auth, validate({ params: resourceIdParamSchema, body: createLoanSchema }), controller.borrow);
router.get('/resources/:id/loans', auth, validate({ params: resourceIdParamSchema, query: listLoansQuerySchema.omit({ resourceId: true }) }), controller.listForResource);
router.get('/loans', auth, validate({ query: listLoansQuerySchema }), controller.list);
router.get('/loans/:loanId', auth, validate({ params: loanIdParamSchema }), controller.getOne);
router.post('/loans/:loanId/return', auth, validate({ params: loanIdParamSchema }), controller.returnLoan);

module.exports = router;
