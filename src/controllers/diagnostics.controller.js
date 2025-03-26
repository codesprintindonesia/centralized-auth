/**
 * Controller untuk health check dan diagnostics
 */
import os from 'os';
import { sequelize } from '../models/index.model.js';
import { successResponse, errorResponse, ResponseCode } from '../utils/response.util.js';
import { logger } from '../utils/logger.util.js';

/**
 * Health check sederhana
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const healthCheck = async (req, res) => {
  return successResponse(
    res,
    ResponseCode.SUCCESS,
    'Service is running',
    {
      status: 'UP',
      timestamp: new Date().toISOString()
    }
  );
};

/**
 * Status layanan lengkap
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const serviceStatus = async (req, res) => {
  try {
    // Cek koneksi database
    let dbStatus = 'DOWN';
    let dbMessage = 'Tidak dapat terhubung ke database';
    
    try {
      await sequelize.authenticate();
      dbStatus = 'UP';
      dbMessage = 'Terhubung ke database';
    } catch (dbError) {
      logger.error(`Database error: ${dbError.message}`);
    }
    
    // Informasi uptime layanan
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);
    
    // Informasi status aplikasi
    const status = {
      service: 'UP',
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: uptimeFormatted,
      version: process.env.npm_package_version || '1.0.0'
    };
    
    return successResponse(
      res,
      ResponseCode.SUCCESS,
      'Status layanan berhasil diambil',
      status
    );
  } catch (error) {
    logger.error(`Service status error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengambil status layanan'
    );
  }
};

/**
 * Status database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const databaseStatus = async (req, res) => {
  try {
    let status = 'UP';
    let message = 'Koneksi database OK';
    let responseTime = 0;
    
    try {
      // Ukur waktu respons database
      const startTime = Date.now();
      await sequelize.query('SELECT 1');
      responseTime = Date.now() - startTime;
      
      // Coba dapatkan informasi klien terhubung (PostgreSQL)
      const [clients] = await sequelize.query(`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE datname = $1
      `, {
        bind: [sequelize.config.database],
        type: sequelize.QueryTypes.SELECT
      });
      
      // Dapatkan informasi dari sequelize
      const dbInfo = {
        name: sequelize.config.database,
        host: sequelize.config.host,
        port: sequelize.config.port,
        dialect: sequelize.options.dialect,
        schema: sequelize.options.searchPath[0],
        activeConnections: clients ? clients.count : 'N/A',
        responseTimeMs: responseTime,
        models: Object.keys(sequelize.models).length,
        status,
        message
      };
      
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Status database berhasil diambil',
        dbInfo
      );
      
    } catch (dbError) {
      status = 'DOWN';
      message = dbError.message;
      
      // Kirim respons error tapi dengan status 200 (health check standard)
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Status database berhasil diambil',
        {
          status,
          message,
          error: dbError.message
        }
      );
    }
  } catch (error) {
    logger.error(`Database status error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengambil status database'
    );
  }
};

/**
 * Informasi sistem
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const systemInfo = async (req, res) => {
  try {
    // Informasi OS dan server
    const osInfo = {
      platform: os.platform(),
      release: os.release(),
      type: os.type(),
      arch: os.arch(),
      uptime: formatUptime(os.uptime()),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMemory: formatBytes(os.totalmem()),
      freeMemory: formatBytes(os.freemem()),
      usedMemoryPercentage: Math.round((1 - os.freemem() / os.totalmem()) * 100)
    };
    
    // Informasi Node.js
    const nodeInfo = {
      version: process.version,
      env: process.env.NODE_ENV || 'development',
      pid: process.pid,
      uptime: formatUptime(process.uptime()),
      memoryUsage: {
        rss: formatBytes(process.memoryUsage().rss),
        heapTotal: formatBytes(process.memoryUsage().heapTotal),
        heapUsed: formatBytes(process.memoryUsage().heapUsed),
        external: formatBytes(process.memoryUsage().external)
      }
    };
    
    return successResponse(
      res,
      ResponseCode.SUCCESS,
      'Informasi sistem berhasil diambil',
      {
        os: osInfo,
        node: nodeInfo,
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    logger.error(`System info error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengambil informasi sistem'
    );
  }
};

/**
 * Format uptime dalam bentuk yang lebih mudah dibaca
 * @param {number} seconds - Uptime dalam detik
 * @returns {string} Uptime terformat
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor(seconds % (3600 * 24) / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${secs}s`;
  
  return result;
}

/**
 * Format bytes dalam bentuk yang lebih mudah dibaca
 * @param {number} bytes - Ukuran dalam bytes
 * @returns {string} Ukuran terformat
 */
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}