/**
 * HTTPS Server untuk aplikasi otentikasi terpusat
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.util.js';

// Mendapatkan __dirname equivalent di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Inisialisasi HTTPS server
 * @param {Object} app - Express application
 * @param {Object} config - Konfigurasi server
 * @returns {https.Server} - Instance HTTPS server
 */
export const initHttpsServer = (app, config) => {
  try {
    // Baca sertifikat SSL
    const sslOptions = {
      key: fs.readFileSync(path.resolve(config.sslKeyPath)),
      cert: fs.readFileSync(path.resolve(config.sslCertPath))
    };

    // Tambahkan passphrase jika ada
    if (config.sslPassphrase) {
      sslOptions.passphrase = config.sslPassphrase;
    }

    // Buat HTTPS server
    const httpsServer = https.createServer(sslOptions, app);

    // Handle error
    httpsServer.on('error', (error) => {
      logger.error(`HTTPS Server Error: ${error.message}`);
      process.exit(1);
    });

    // Handle listening event
    httpsServer.on('listening', () => {
      const addr = httpsServer.address();
      const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
      logger.info(`HTTPS Server listening on ${bind}`);
    });

    // Mulai mendengarkan pada port yang ditentukan
    httpsServer.listen(config.port);

    return httpsServer;
  } catch (error) {
    logger.error(`Failed to initialize HTTPS server: ${error.message}`);
    throw error;
  }
};