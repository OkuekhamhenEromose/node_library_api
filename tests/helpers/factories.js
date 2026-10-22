let counter = 0;

// A valid payload for POST /resources. Every call gets a unique ISBN-13-shaped value.
function buildResource(overrides = {}) {
  counter += 1;
  return {
    title: `Test Book ${counter}`,
    author: 'Ada Author',
    isbn: String(9780000000000 + counter),
    category: 'technology',
    tags: ['test'],
    publishedYear: 2020,
    totalCopies: 3,
    ...overrides,
  };
}

module.exports = { buildResource };
