'use strict';

const format = (level, message, meta) => {
  const base = {
    level,
    message,
    time: new Date().toISOString(),
  };
  return JSON.stringify(meta ? { ...base, ...meta } : base);
};

module.exports = {
  info(message, meta) {
    try {
      console.log(format('info', message, meta));
    } catch (e) {
      console.log(`[info] ${message}`);
    }
  },
  warn(message, meta) {
    try {
      console.warn(format('warn', message, meta));
    } catch (e) {
      console.warn(`[warn] ${message}`);
    }
  },
  error(message, meta) {
    try {
      console.error(format('error', message, meta));
    } catch (e) {
      console.error(`[error] ${message}`);
    }
  },
};


