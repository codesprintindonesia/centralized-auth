 
/**
 * Utility untuk logging
 */
import winston from 'winston';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mendapatkan __dirname equivalent di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Memastikan folder logs ada
const logsDir = path.join(path.dirname(path.dirname(__dirname)), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(logColors);

// Create format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Get log level from environment or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

// Create logger
export const logger = winston.createLogger({
  levels: logLevels,
  level: logLevel,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console(),
    
    // File transports
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    })
  ]
});

// Log initialization
logger.info(`Logger initialized with level: ${logLevel}`);