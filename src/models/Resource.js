const mongoose = require('mongoose');
const { CATEGORIES, STATUSES } = require('../constants');

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    author: { type: String, required: true, trim: true, maxlength: 120 },
    isbn: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: CATEGORIES },
    tags: { type: [String], default: [] },
    publishedYear: { type: Number },
    totalCopies: { type: Number, required: true, min: 1 },
    availableCopies: { type: Number, required: true, min: 0 },
    status: { type: String, enum: STATUSES, default: 'active' },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      // Output shaping: the API exposes `id`, never `_id`.
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

// FEATURE 1: the business rule "one record per ISBN" is enforced by the DATABASE.
resourceSchema.index({ isbn: 1 }, { unique: true });

// FEATURE 2: indexes chosen from the list query patterns (equality fields first, then the sort field):
//   GET /resources                    -> { status } sorted by createdAt desc
//   GET /resources?category=science   -> { status, category } sorted by createdAt desc
resourceSchema.index({ status: 1, createdAt: -1 });
resourceSchema.index({ status: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Resource', resourceSchema);
