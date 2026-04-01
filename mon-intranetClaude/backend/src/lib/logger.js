// src/lib/logger.js — Structured logging via pino
const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize:    true,
        translateTime: 'SYS:HH:MM:ss',
        ignore:      'pid,hostname',
      },
    },
  }),
  // En production : JSON brut pour ingestion par un log aggregator
});

module.exports = logger;
