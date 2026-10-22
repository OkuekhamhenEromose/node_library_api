const service = require('../services/resource.service');

// Controllers translate HTTP <-> service calls. Express 5 forwards rejected promises to the error handler.
async function create(req, res) {
  const resource = await service.create(req.valid.body);
  res.status(201).location(`/resources/${resource.id}`).json({ data: resource });
}

// FEATURE 2
async function getOne(req, res) {
  const resource = await service.getById(req.valid.params.id);
  res.json({ data: resource });
}

async function list(req, res) {
  res.json(await service.list(req.valid.query));
}

// FEATURE 3
async function update(req, res) {
  res.json({ data: await service.update(req.valid.params.id, req.valid.body) });
}

async function remove(req, res) {
  await service.archive(req.valid.params.id);
  res.status(204).end();
}

module.exports = { create, getOne, list, update, remove };
