const Resource = require('../models/Resource');
const Loan = require('../models/Loan');
const AppError = require('../lib/AppError');
const { skipFor, buildMeta } = require('../lib/pagination');
const logger = require('../lib/logger');
const { LOAN_DAYS, MAX_ACTIVE_LOANS_PER_BORROWER } = require('../constants');

// FEATURE 5 (fixed): the decision "is a copy available?" and the change "take one" are ONE atomic
// database operation. There is no gap between check and write for another request to slip into.
async function borrow(resourceId, { borrowerName, borrowerEmail }) {
  // Advisory policy check. NOTE: this count-then-act is itself racy for the SAME borrower sending
  // simultaneous requests (see Chapter on limits). It protects policy, not inventory integrity.
  const active = await Loan.countDocuments({ borrowerEmail, status: 'active' });
  if (active >= MAX_ACTIVE_LOANS_PER_BORROWER) {
    throw new AppError(422, 'LOAN_LIMIT_REACHED', `A borrower may hold at most ${MAX_ACTIVE_LOANS_PER_BORROWER} active loans`);
  }

  // Step 1: atomically claim one copy. The filter is the check; $inc is the write.
  const claimed = await Resource.findOneAndUpdate(
    { _id: resourceId, status: 'active', availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 } },
    { returnDocument: 'after' },
  );
  if (!claimed) {
    // The claim failed. Find out why so the client gets the right answer.
    const resource = await Resource.findById(resourceId).select('status');
    if (!resource) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
    if (resource.status !== 'active') throw new AppError(409, 'RESOURCE_ARCHIVED', 'Resource is archived');
    throw new AppError(409, 'NO_COPIES_AVAILABLE', 'No copies available');
  }

  // Step 2: record the loan. If this fails, give the copy back (compensation).
  try {
    const borrowedAt = new Date();
    const loan = await Loan.create({
      resourceId,
      borrowerName,
      borrowerEmail,
      borrowedAt,
      dueAt: new Date(borrowedAt.getTime() + LOAN_DAYS * 24 * 60 * 60 * 1000),
    });
    return loan.toJSON();
  } catch (err) {
    await Resource.updateOne({ _id: resourceId }, { $inc: { availableCopies: 1 } }).catch((e) =>
      // If even the compensation fails, make it loud: this is the drift that reconcile.service repairs.
      logger.error('compensation failed: inventory drift', { resourceId, err: e.message }),
    );
    throw err;
  }
}

async function returnLoan(loanId) {
  // Atomic guard: only ONE caller can flip active -> returned. The others match nothing.
  const loan = await Loan.findOneAndUpdate(
    { _id: loanId, status: 'active' },
    { $set: { status: 'returned', returnedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!loan) {
    const exists = await Loan.exists({ _id: loanId });
    if (!exists) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');
    throw new AppError(409, 'ALREADY_RETURNED', 'Loan was already returned');
  }
  try {
    await Resource.updateOne({ _id: loan.resourceId }, { $inc: { availableCopies: 1 } });
  } catch (err) {
    logger.error('inventory restore failed after return: inventory drift', {
      loanId, resourceId: String(loan.resourceId), err: err.message,
    });
    throw err;
  }
  return loan.toJSON();
}

async function getById(loanId) {
  const loan = await Loan.findById(loanId);
  if (!loan) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');
  return loan.toJSON();
}

async function list({ page, limit, status, borrowerEmail, resourceId }) {
  const filter = {};
  if (status) filter.status = status;
  if (borrowerEmail) filter.borrowerEmail = borrowerEmail;
  if (resourceId) filter.resourceId = resourceId;
  const [docs, total] = await Promise.all([
    Loan.find(filter)
      .sort({ borrowedAt: -1, _id: -1 })
      .skip(skipFor({ page, limit }))
      .limit(limit),
    Loan.countDocuments(filter),
  ]);
  return {
    data: docs.map((d) => d.toJSON()),
    meta: buildMeta({ page, limit, total }),
  };
}

module.exports = { borrow, returnLoan, getById, list };
