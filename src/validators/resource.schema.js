const { z } = require('zod');
const { CATEGORIES, STATUSES } = require('../constants');
const { objectId, pageParams } = require('./common');

// FEATURE 2 (fix): a path id must LOOK like an ObjectId before we ever query with it.
const idParamSchema = z.strictObject({ id: objectId });

// Accept "978-0-13-468599-1" or "9780134685991"; store digits only.
const isbn = z
  .string()
  .trim()
  .transform((s) => s.replace(/-/g, ''))
  .pipe(z.string().regex(/^(\d{9}[\dXx]|\d{13})$/, 'must be an ISBN-10 or ISBN-13'));

// strictObject: unknown fields are REJECTED (this is our mass-assignment protection).
const createResourceSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(120),
  isbn,
  category: z.enum(CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  publishedYear: z
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear() + 1)
    .optional(),
  totalCopies: z.number().int().min(1).max(1000),
});

// FEATURE 3: PATCH body. No defaults here (a missing field must mean "leave unchanged"),
// and no isbn (identity is immutable), no availableCopies/status (those change via operations).
const updateResourceSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(200),
    author: z.string().trim().min(1).max(120),
    category: z.enum(CATEGORIES),
    tags: z.array(z.string().trim().min(1).max(30)).max(10),
    publishedYear: z
      .number()
      .int()
      .min(1000)
      .max(new Date().getFullYear() + 1),
    totalCopies: z.number().int().min(1).max(1000),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'at least one field is required' });

// FEATURE 2: every list parameter is typed, bounded and allow-listed.
// Query strings are always strings, so numbers use z.coerce; arrays/objects fail the enum checks.
const listQuerySchema = z.strictObject({
  ...pageParams,
  sort: z
    .enum(['createdAt', '-createdAt', 'title', '-title', 'publishedYear', '-publishedYear'])
    .default('-createdAt'),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(STATUSES).default('active'),
  available: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  tag: z.string().trim().min(1).max(30).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

module.exports = { createResourceSchema, updateResourceSchema, listQuerySchema, idParamSchema };
