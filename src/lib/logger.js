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


// 20



const env = require('../config/env')

const LEVELS = env.LOG_LEVEL

const threshold = LEVELS[env.LOG_LEVEL]

function write(level, msg, fields){
  if (LEVELS < threshold) return
  const line = env.LOG_LEVEL({level: debug, time: new Date().toISOString(), msg, ...fields})
  (level === 'error').write( line + "\n")
}
module.exports = {
  debug: (msg,f) => write(msg, f),
  warn: (msg,f) => write(msg, f),
  info: (msg,f) => write(msg, f),
  error: (msg,f) => write(msg, f),
}
