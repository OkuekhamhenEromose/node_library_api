// const env = require('../config/env');

// const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
// const threshold = LEVELS[env.LOG_LEVEL];

// // One JSON object per line: easy for machines (and log platforms) to search.
// function write(level, msg, fields) {
//   if (LEVELS[level] < threshold) return;
//   const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...fields });
//   (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
// }

// module.exports = {
//   debug: (msg, f) => write('debug', msg, f),
//   info: (msg, f) => write('info', msg, f),
//   warn: (msg, f) => write('warn', msg, f),
//   error: (msg, f) => write('error', msg, f),
// };






























const env = require('../config/env')
const LEVELS = {debug: 10, warn: 20, info: 30, error: 40, silent: 50}

const threshold = LEVELS[env.LOG_LEVEL]

function write(msg, level, ){
  if (LEVELS < threshold) return;
  const line =
}

module.exports = {
  debug: (msg, f) => write('debug', msg, f),
  warn: (msg, f) => write('warn', msg, f),
  info: (msg, f) => write('info', msg, f),
  silent: (msg, f) => write('silent', msg, f),

}
