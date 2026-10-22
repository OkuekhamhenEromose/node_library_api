const mongoose = require('mongoose');
const { LOAN_STATUSES } = require('../constants');

// Loans are their own collection (REFERENCE, not embedded in Resource):
//   - they grow without bound over a resource's lifetime,
//   - they are queried on their own (by borrower, by status),
//   - they have their own lifecycle (active -> returned).
const loanSchema = new mongoose.Schema(
  {
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    borrowerName: { type: String, required: true, trim: true, maxlength: 120 },
    borrowerEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    borrowedAt: { type: Date, required: true },
    dueAt: { type: Date, required: true },
    returnedAt: { type: Date, default: null },
    status: { type: String, enum: LOAN_STATUSES, default: 'active' },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

// Query patterns -> indexes
loanSchema.index({ resourceId: 1, borrowedAt: -1 }); // GET /resources/:id/loans
loanSchema.index({ borrowerEmail: 1, status: 1 }); // active-loan limit check, GET /loans?borrowerEmail=

module.exports = mongoose.model('Loan', loanSchema);
