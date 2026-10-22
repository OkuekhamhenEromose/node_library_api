const { z } = require('zod');
const { LOAN_STATUSES } = require('../constants');
const { objectId, pageParams } = require('./common');

const resourceIdParamSchema = z.strictObject({ id: objectId });
const loanIdParamSchema = z.strictObject({ loanId: objectId });

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

const createLoanSchema = z.strictObject({
  borrowerName: z.string().trim().min(1).max(120),
  borrowerEmail: email,
});

const listLoansQuerySchema = z.strictObject({
  ...pageParams,
  status: z.enum(LOAN_STATUSES).optional(),
  borrowerEmail: email.optional(),
  resourceId: objectId.optional(),
});

module.exports = { resourceIdParamSchema, loanIdParamSchema, createLoanSchema, listLoansQuerySchema };
