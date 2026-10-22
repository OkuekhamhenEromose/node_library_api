const Resource = require('../models/Resource');
const AppError = require('../lib/AppError');
const { skipFor, buildMeta } = require('../lib/pagination');
const escapeRegex = require('../lib/escapeRegex');

// Business logic lives here; no req/res. A new resource starts with every copy available.
async function create(input) {
  try {
    const doc = await Resource.create({ ...input, availableCopies: input.totalCopies });
    return doc.toJSON();
  } catch (err) {
    // The service knows its own unique constraint (isbn), so it does not depend on
    // driver-specific error fields such as keyPattern (see Debugging chapter).
    if (err.code === 11000) {
      throw new AppError(409, 'DUPLICATE_RESOURCE', 'A resource with this isbn already exists');
    }
    throw err;
  }
}

// FEATURE 2
async function getById(id) {
  const doc = await Resource.findById(id);
  if (!doc) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
  return doc.toJSON();
}

async function list({ page, limit, sort, category, status, available, tag, q }) {
  const filter = { status };
  if (category) filter.category = category;
  if (tag) filter.tags = tag;
  if (available === true) filter.availableCopies = { $gt: 0 };
  if (available === false) filter.availableCopies = 0;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i'); // literal, case-insensitive
    filter.$or = [{ title: rx }, { author: rx }];
  }

  const dir = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');
  // _id is a tie-breaker so pages are stable even when the sort field has equal values.
  const sortSpec = { [field]: dir, _id: dir };

  const [docs, total] = await Promise.all([
    Resource.find(filter)
      .sort(sortSpec)
      .skip(skipFor({ page, limit }))
      .limit(limit),
    Resource.countDocuments(filter),
  ]);

  return {
    data: docs.map((d) => d.toJSON()),
    meta: buildMeta({ page, limit, total }),
  };
}

// FEATURE 3
async function update(id, patch) {
  const cur = await Resource.findById(id);
  if (!cur) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
  if (cur.status === 'archived') {
    throw new AppError(409, 'RESOURCE_ARCHIVED', 'Archived resources cannot be modified');
  }

  const { totalCopies, ...fields } = patch;
  const update = {};
  if (Object.keys(fields).length) update.$set = fields;

  // The filter is the concurrency guard: the write only applies if the world is still as we read it.
  const filter = { _id: id, status: 'active' };

  if (totalCopies !== undefined && totalCopies !== cur.totalCopies) {
    const onLoan = cur.totalCopies - cur.availableCopies;
    if (totalCopies < onLoan) {
      throw new AppError(422, 'BELOW_COPIES_ON_LOAN', `Cannot set totalCopies below the ${onLoan} copies on loan`);
    }
    const delta = totalCopies - cur.totalCopies;
    update.$set = { ...(update.$set || {}), totalCopies };
    update.$inc = { availableCopies: delta };
    filter.totalCopies = cur.totalCopies; // optimistic concurrency: nobody else changed the total
    filter.availableCopies = { $gte: Math.max(0, -delta) }; // evaluated atomically at write time
  }

  const updated = await Resource.findOneAndUpdate(filter, update, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!updated) {
    throw new AppError(409, 'CONFLICT', 'The resource changed while it was being updated; retry');
  }
  return updated.toJSON();
}

// FEATURE 3: DELETE means "archive" (soft delete). History and future loan records keep a valid target.
async function archive(id) {
  const cur = await Resource.findById(id);
  if (!cur) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
  if (cur.status === 'archived') return; // idempotent: deleting twice is fine

  const archived = await Resource.findOneAndUpdate(
    // only archive when every copy is back on the shelf, and nothing changed since we looked
    { _id: id, status: 'active', totalCopies: cur.totalCopies, availableCopies: cur.totalCopies },
    { $set: { status: 'archived' } },
    { returnDocument: 'after' },
  );
  if (!archived) {
    throw new AppError(409, 'HAS_ACTIVE_LOANS', 'Cannot archive a resource that has copies on loan');
  }
}

module.exports = { create, getById, list, update, archive };
