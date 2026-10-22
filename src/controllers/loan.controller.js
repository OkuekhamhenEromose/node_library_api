const service = require('../services/loan.service');

async function borrow(req, res) {
  const loan = await service.borrow(req.valid.params.id, req.valid.body);
  res.status(201).location(`/loans/${loan.id}`).json({ data: loan });
}

async function returnLoan(req, res) {
  res.json({ data: await service.returnLoan(req.valid.params.loanId) });
}

async function getOne(req, res) {
  res.json({ data: await service.getById(req.valid.params.loanId) });
}

async function list(req, res) {
  res.json(await service.list(req.valid.query));
}

async function listForResource(req, res) {
  res.json(await service.list({ ...req.valid.query, resourceId: req.valid.params.id }));
}

module.exports = { borrow, returnLoan, getOne, list, listForResource };
