// Turn user text into a *literal* regex fragment so "(" or ".*" cannot break or abuse the query.
module.exports = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
