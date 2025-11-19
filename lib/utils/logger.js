/**
 * Logger simples com suporte a diferentes níveis.
 * Pode ser substituído por Winston, Pino ou outro logger profissional.
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

function formatLog(level, data) {
  const timestamp = new Date().toISOString();
  const message = typeof data === 'string' ? data : JSON.stringify(data);
  return `[${timestamp}] [${level}] ${message}`;
}

export default {
  error: (data) => {
    console.error(formatLog(LOG_LEVELS.ERROR, data));
  },
  
  warn: (data) => {
    console.warn(formatLog(LOG_LEVELS.WARN, data));
  },
  
  info: (data) => {
    console.log(formatLog(LOG_LEVELS.INFO, data));
  },
  
  debug: (data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog(LOG_LEVELS.DEBUG, data));
    }
  }
};
