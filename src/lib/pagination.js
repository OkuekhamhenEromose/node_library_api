// REFACTOR: the same arithmetic was written twice (resource.service.js and loan.service.js).
const skipFor = ({ page, limit }) => (page - 1) * limit;
const buildMeta = ({ page, limit, total }) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });

module.exports = { skipFor, buildMeta };
