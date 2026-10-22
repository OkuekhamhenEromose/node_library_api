const Resource = require('../models/Resource');
const Loan = require('../models/Loan');

// Invariant:  availableCopies == totalCopies - (number of ACTIVE loans)
// Two-step writes (borrow/return) can drift if the process dies between steps. This finds and repairs drift.
// NodeVol 7 removes the cause with transactions; until then this is the safety net.
async function findDrift() {
  const grouped = await Loan.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$resourceId', n: { $sum: 1 } } },
  ]);
  const activeByResource = new Map(grouped.map((g) => [String(g._id), g.n]));

  const drift = [];
  for await (const r of Resource.find({}).select('totalCopies availableCopies')) {
    const expected = r.totalCopies - (activeByResource.get(String(r._id)) || 0);
    if (r.availableCopies !== expected) {
      drift.push({ resourceId: String(r._id), actual: r.availableCopies, expected });
    }
  }
  return drift;
}

// Run in a quiet period: it overwrites the counter, so a borrow in flight could be miscounted.
async function fixDrift() {
  const drift = await findDrift();
  for (const d of drift) {
    await Resource.updateOne({ _id: d.resourceId }, { $set: { availableCopies: d.expected } });
  }
  return drift;
}

module.exports = { findDrift, fixDrift };
