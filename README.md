# library-api

Library Resource Management API. NodeVol 5, Project 1 of the "Think Like a Backend Engineer" Node.js track.
Node.js + Express 5 + MongoDB (Mongoose 9). Staff manage a catalogue of resources (books) and lend them out.

## Requirements
- Node.js 20 or newer
- A MongoDB server you can reach (local, container, or hosted)

## Setup
    npm install
    cp .env.example .env        # then edit MONGODB_URI and set a long random API_KEY
    npm start                   # or: npm run dev   (restarts on file changes)

## Configuration (environment variables)
| Variable | Required | Default | Meaning |
|---|---|---|---|
| MONGODB_URI | yes | - | connection string |
| API_KEY | yes | - | shared secret for writes and loan endpoints (min 16 characters) |
| PORT | no | 3000 | HTTP port |
| LOG_LEVEL | no | info | debug / info / warn / error / silent |
| MONGODB_MAX_POOL_SIZE | no | 10 | connection pool size |
| NODE_ENV | no | development | development / test / production |

The process exits with code 1 and a message if configuration is missing or invalid.

## API
Writes and every `/loans` route need the header `x-api-key: <API_KEY>`. Catalogue reads are public.

| Method and path | Purpose |
|---|---|
| GET /health, GET /ready | liveness, readiness (503 when the database is down) |
| POST /resources | create (201, Location header) |
| GET /resources | list: page, limit (max 100), sort, category, tag, available, status, q |
| GET /resources/:id | read one |
| PATCH /resources/:id | update title, author, category, tags, publishedYear, totalCopies |
| DELETE /resources/:id | archive (204); refused while copies are on loan |
| POST /resources/:id/loans | borrow a copy (14 days; max 3 active loans per borrower) |
| GET /resources/:id/loans, GET /loans, GET /loans/:loanId | read loans |
| POST /loans/:loanId/return | return a loan |

Errors always look like `{ "error": { "code", "message", "details?", "requestId" } }`.

## Tests
    npm test
Tests delete data. Point them at a disposable database: `MONGODB_URI_TEST=mongodb://127.0.0.1:27017/library_test npm test`.
With a real MongoDB set MONGODB_URI_TEST. Without it the tests use a local FerretDB on 127.0.0.1:27017 with a pool of one connection (see tests/setup-env.js).

## Operations
- `npm run reconcile` reports inventory drift (availableCopies vs active loans); add `-- --fix` to repair.
- SIGTERM/SIGINT: stops accepting connections, drains, closes MongoDB, exits 0 (hard stop after 10 s).

## Known limits
- A borrower can exceed 3 active loans with simultaneous requests (count-then-act).
- A retried borrow request creates a second loan (no idempotency keys yet).
- A process crash between the two writes of borrow/return can cause drift; use reconcile.
- One shared API key: no identity, roles or rate limiting.
