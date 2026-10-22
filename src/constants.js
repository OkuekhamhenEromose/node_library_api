const CATEGORIES = ['fiction', 'nonfiction', 'science', 'technology', 'history', 'children', 'other'];
const STATUSES = ['active', 'archived'];

// FEATURE 5: loan policy
const LOAN_DAYS = 14;
const MAX_ACTIVE_LOANS_PER_BORROWER = 3;
const LOAN_STATUSES = ['active', 'returned'];

module.exports = { CATEGORIES, STATUSES, LOAN_DAYS, MAX_ACTIVE_LOANS_PER_BORROWER, LOAN_STATUSES };
