 
/**
 * HTTP Server untuk aplikasi otentikasi terpusat
 */
import http from 'http';
import { logger } from '../utils/logger.util.js';

/**
 * Inisialisasi HTTP server
 * @param {Object} app - Express application
 * @param {Object} config - Konfigurasi server
 * @returns {http.Server} - Instance HTTP server
 */
export const initHttpServer = (app, config) => {
  // Buat HTTP server
  const httpServer = http.createServer(app);

  // Handle error
  httpServer.on('error', (error) => {
    logger.error(`HTTP Server Error: ${error.message}`);
    process.exit(1);
  });

  // Handle listening event
  httpServer.on('listening', () => {
    const addr = httpServer.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    logger.info(`HTTP Server listening on ${bind}`);
  });

  // Mulai mendengarkan pada port yang ditentukan
  httpServer.listen(config.port);

  return httpServer;
};