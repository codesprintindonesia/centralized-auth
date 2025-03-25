 
/**
 * Middleware untuk otentikasi dan otorisasi
 */
import jwt from 'jsonwebtoken';
import { verifyApiKey } from '../services/consumer.service.js';
import { verifyToken, hasPermission } from '../services/auth.service.js';
import { verifySignature } from '../services/crypto.service.js';
import { errorResponse, ResponseCode } from '../utils/response.util.js';
import { logger } from '../utils/logger.util.js';
import { AppError } from './error.middleware.js';

/**
 * Middleware untuk verifikasi API key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const consumerName = req.headers['x-consumer-name'];
    
    // Cek keberadaan header yang diperlukan
    if (!apiKey) {
      return errorResponse(
        res,
        ResponseCode.UNAUTHORIZED,
        'API key diperlukan'
      );
    }
    
    if (!consumerName) {
      return errorResponse(
        res,
        ResponseCode.UNAUTHORIZED,
        'Header x-consumer-name diperlukan'
      );
    }
    
    // Verifikasi API key
    const result = await verifyApiKey(apiKey, consumerName);
    
    if (!result.success) {
      return errorResponse(
        res,
        ResponseCode.UNAUTHORIZED,
        result.message || 'API key tidak valid'
      );
    }
    
    // Simpan informasi consumer ke request object
    req.consumer = result.consumer;
    next();
  } catch (error) {
    logger.error(`API key authentication error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat memverifikasi API key'
    );
  }
};

/**
 * Middleware untuk verifikasi JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateJwt = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Cek keberadaan header Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(
        res,
        ResponseCode.UNAUTHORIZED,
        'Token otentikasi tidak valid'
      );
    }
    
    // Ekstrak token dari header
    const token = authHeader.split(' ')[1];
    
    // Verifikasi token pada database
    const result = await verifyToken(token, req.consumer.id);
    
    if (!result.success) {
      return errorResponse(
        res,
        ResponseCode.UNAUTHORIZED,
        result.message || 'Token tidak valid'
      );
    }
    
    // Simpan informasi user ke request object
    req.user = result.user;
    next();
  } catch (error) {
    logger.error(`JWT authentication error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat memverifikasi token'
    );
  }
};

/**
 * Middleware untuk verifikasi tanda tangan
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const verifyRequestSignature = async (req, res, next) => {
  try {
    const signature = req.headers['x-signature'];
    
    // Jika tidak ada tanda tangan, lewati verifikasi (opsional)
    if (!signature) {
      logger.warn('Request without signature detected');
      req.signatureVerified = false;
      return next();
    }
    
    // Format: signature:timestamp:nonce
    const parts = signature.split(':');
    
    if (parts.length !== 3) {
      return errorResponse(
        res,
        ResponseCode.UNAUTHORIZED,
        'Format tanda tangan tidak valid'
      );
    }
    
    const [signatureValue, timestamp, nonce] = parts;
    
    // Periksa kedaluwarsa timestamp (toleransi 5 menit)
    const signatureTime = parseInt(timestamp);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeThreshold = 5 * 60; // 5 menit
    
    if (currentTime - signatureTime > timeThreshold) {
      return errorResponse(
        res,
        ResponseCode.UNAUTHORIZED,
        'Tanda tangan sudah kedaluwarsa'
      );
    }
    
    // Buat data yang ditandatangani
    // Format: timestamp:nonce:HTTP-METHOD:requestPath:requestBodyHash
    const method = req.method;
    const path = req.originalUrl;
    let bodyStr = '';
    
    if (req.body && Object.keys(req.body).length > 0) {
      // Sort body keys untuk konsistensi
      const sortedBody = Object.keys(req.body).sort().reduce((result, key) => {
        result[key] = req.body[key];
        return result;
      }, {});
      
      bodyStr = JSON.stringify(sortedBody);
    }
    
    const signatureData = `${timestamp}:${nonce}:${method}:${path}:${bodyStr}`;
    
    // Verifikasi tanda tangan menggunakan kunci publik consumer
    const isValid = verifySignature(signatureData, signatureValue, req.consumer.public_key);
    
    if (!isValid) {
      return errorResponse(
        res,
        ResponseCode.UNAUTHORIZED,
        'Tanda tangan tidak valid'
      );
    }
    
    // Tanda tangan valid
    req.signatureVerified = true;
    next();
  } catch (error) {
    logger.error(`Signature verification error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat memverifikasi tanda tangan'
    );
  }
};

/**
 * Middleware untuk memeriksa izin pengguna
 * @param {string|string[]} permissions - Izin yang diperlukan
 * @returns {Function} Express middleware
 */
export const requirePermission = (permissions) => {
  return async (req, res, next) => {
    try {
      // Pastikan user sudah diautentikasi
      if (!req.user || !req.user.id) {
        return errorResponse(
          res,
          ResponseCode.UNAUTHORIZED,
          'Autentikasi diperlukan'
        );
      }
      
      // Normalisasi permissions ke array
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
      
      // Jika tidak ada izin yang diperlukan, lanjutkan
      if (requiredPermissions.length === 0) {
        return next();
      }
      
      // Cek izin pengguna
      for (const permission of requiredPermissions) {
        const hasRequiredPermission = await hasPermission(req.user.id, permission);
        
        if (!hasRequiredPermission) {
          return errorResponse(
            res,
            ResponseCode.FORBIDDEN,
            'Anda tidak memiliki izin yang diperlukan'
          );
        }
      }
      
      // Pengguna memiliki semua izin yang diperlukan
      next();
    } catch (error) {
      logger.error(`Permission check error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat memeriksa izin'
      );
    }
  };
};

/**
 * Middleware untuk memeriksa peran pengguna
 * @param {string|string[]} roles - Peran yang diizinkan
 * @returns {Function} Express middleware
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      // Pastikan user sudah diautentikasi
      if (!req.user || !req.user.roles) {
        return errorResponse(
          res,
          ResponseCode.UNAUTHORIZED,
          'Autentikasi diperlukan'
        );
      }
      
      // Normalisasi roles ke array
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      // Cek peran pengguna
      const userRoles = req.user.roles;
      const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role));
      
      if (!hasAllowedRole) {
        return errorResponse(
          res,
          ResponseCode.FORBIDDEN,
          'Anda tidak memiliki peran yang diizinkan'
        );
      }
      
      // Pengguna memiliki peran yang diizinkan
      next();
    } catch (error) {
      logger.error(`Role check error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat memeriksa peran'
      );
    }
  };
};

/**
 * Middleware untuk otentikasi lengkap (API key + JWT)
 * Menggabungkan authenticateApiKey dan authenticateJwt
 */
export const fullAuthentication = [
  authenticateApiKey,
  authenticateJwt
];

/**
 * Middleware untuk otentikasi lengkap dengan tanda tangan
 * Menggabungkan authenticateApiKey, verifyRequestSignature, dan authenticateJwt
 */
export const secureAuthentication = [
  authenticateApiKey,
  verifyRequestSignature,
  authenticateJwt
];