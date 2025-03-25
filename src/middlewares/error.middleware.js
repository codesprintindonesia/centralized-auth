/**
 * Middleware untuk penanganan error global
 */
import { errorResponse, ResponseCode } from '../utils/response.util.js';
import { logger } from '../utils/logger.util.js';

/**
 * Middleware untuk menangani 404 Not Found
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const notFoundHandler = (req, res, next) => {
  errorResponse(
    res,
    ResponseCode.NOT_FOUND,
    `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`
  );
};

/**
 * Middleware untuk menangani error global
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
  // Log error detail
  logger.error(`Unhandled Error: ${err.message}`);
  logger.error(err.stack);
  
  // Cek jika respons sudah dikirim
  if (res.headersSent) {
    return next(err);
  }
  
  // Default error response
  let code = ResponseCode.INTERNAL_ERROR;
  let message = 'Terjadi kesalahan pada server';
  let statusCode = 500;
  
  // Customize error response berdasarkan tipe error
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    code = ResponseCode.UNPROCESSABLE;
    message = 'Validasi database gagal';
    statusCode = 422;
    
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    
    return errorResponse(res, code, message, errors);
  }
  
  if (err.name === 'SequelizeDatabaseError') {
    code = ResponseCode.DATABASE_ERROR;
    message = 'Terjadi kesalahan pada database';
  }
  
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    code = ResponseCode.INVALID_TOKEN;
    message = 'Token tidak valid atau sudah kedaluwarsa';
    statusCode = 401;
  }
  
  // Custom application error
  if (err.isAppError) {
    code = err.code || ResponseCode.INTERNAL_ERROR;
    message = err.message;
    statusCode = err.statusCode || 500;
  }
  
  return errorResponse(res, code, message);
};

/**
 * Class for custom application errors
 */
export class AppError extends Error {
  /**
   * Create a new application error
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, code = ResponseCode.INTERNAL_ERROR, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isAppError = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Create a not found error
   * @param {string} message - Error message
   * @returns {AppError} Not found error
   */
  static notFound(message = 'Resource tidak ditemukan') {
    return new AppError(message, ResponseCode.NOT_FOUND, 404);
  }
  
  /**
   * Create a bad request error
   * @param {string} message - Error message
   * @returns {AppError} Bad request error
   */
  static badRequest(message = 'Permintaan tidak valid') {
    return new AppError(message, ResponseCode.BAD_REQUEST, 400);
  }
  
  /**
   * Create an unauthorized error
   * @param {string} message - Error message
   * @returns {AppError} Unauthorized error
   */
  static unauthorized(message = 'Autentikasi diperlukan') {
    return new AppError(message, ResponseCode.UNAUTHORIZED, 401);
  }
  
  /**
   * Create a forbidden error
   * @param {string} message - Error message
   * @returns {AppError} Forbidden error
   */
  static forbidden(message = 'Anda tidak memiliki izin untuk mengakses resource ini') {
    return new AppError(message, ResponseCode.FORBIDDEN, 403);
  }
  
  /**
   * Create a conflict error
   * @param {string} message - Error message
   * @returns {AppError} Conflict error
   */
  static conflict(message = 'Terjadi konflik dengan resource yang ada') {
    return new AppError(message, ResponseCode.CONFLICT, 409);
  }
  
  /**
   * Create a validation error
   * @param {string} message - Error message
   * @returns {AppError} Validation error
   */
  static validation(message = 'Validasi gagal') {
    return new AppError(message, ResponseCode.UNPROCESSABLE, 422);
  }
  
  /**
   * Create a service unavailable error
   * @param {string} message - Error message
   * @returns {AppError} Service unavailable error
   */
  static serviceUnavailable(message = 'Layanan tidak tersedia saat ini') {
    return new AppError(message, ResponseCode.SERVICE_UNAVAILABLE, 503);
  }
}