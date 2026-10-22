// const fs = require('node:fs');
// const { z } = require('zod');

// // Load .env for local development (Node 21.7+). Real environment variables always win.
// if (fs.existsSync('.env')) process.loadEnvFile('.env');

// const schema = z.object({
//   NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
//   PORT: z.coerce.number().int().min(1).max(65535).default(3000),
//   MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
//   // FEATURE 5: connection pool size is a real production tuning knob (default 10).
//   MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
//   LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
//   // FEATURE 4: shared secret for write operations. Minimum length discourages guessable keys.
//   API_KEY: z.string().min(16, 'API_KEY must be at least 16 characters'),
// });

// const parsed = schema.safeParse(process.env);
// if (!parsed.success) {
//   // Fail fast at startup instead of failing mysteriously later.
//   const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
//   console.error(`Invalid environment configuration:\n${lines.join('\n')}`);
//   process.exit(1);
// }

// module.exports = Object.freeze(parsed.data);





























const fs = require('node:fs')
const {z} = require('zod')

if (fs.existsSync('.env')) process.env('.env')

const schema = {
  NODE_ENV: z.enum(['development', 'testing', 'production']).default('development'),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min().max().default(),
  MONGODB_URI: z.string().min(),
  LOG_LEVEL: z.enum(['debug', 'warn']),
  API_KEY: z.string().min(),
  PORT: z.coerce.number().int().min().max().default(),
}

const parsed = schema.safeParse(process.env)

if (!parsed.success){
  const lines =
}
