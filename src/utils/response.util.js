/**
 * Utility untuk format response API
 */
import { logger } from './logger.util.js';

/**
 * Konstanta untuk kode respons
 */
export const ResponseCode = {
  // Success codes
  SUCCESS: 'SUCCESS',
  CREATED: 'CREATED',
  ACCEPTED: 'ACCEPTED',
  NO_CONTENT: 'NO_CONTENT',
  
  // Error codes - Client
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE: 'UNPROCESSABLE',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Error codes - Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  
  // Error codes - Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
};

/**
 * Map kode respons ke HTTP status code
 */
const HTTP_STATUS_MAP = {
  // Success codes
  [ResponseCode.SUCCESS]: 200,
  [ResponseCode.CREATED]: 201,
  [ResponseCode.ACCEPTED]: 202,
  [ResponseCode.NO_CONTENT]: 204,
  
  // Error codes - Client
  [ResponseCode.BAD_REQUEST]: 400,
  [ResponseCode.UNAUTHORIZED]: 401,
  [ResponseCode.FORBIDDEN]: 403,
  [ResponseCode.NOT_FOUND]: 404,
  [ResponseCode.METHOD_NOT_ALLOWED]: 405,
  [ResponseCode.CONFLICT]: 409,
  [ResponseCode.UNPROCESSABLE]: 422,
  [ResponseCode.TOO_MANY_REQUESTS]: 429,
  
  // Error codes - Authentication
  [ResponseCode.INVALID_CREDENTIALS]: 401,
  [ResponseCode.INVALID_TOKEN]: 401,
  [ResponseCode.TOKEN_EXPIRED]: 401,
  [ResponseCode.TOKEN_REVOKED]: 401,
  [ResponseCode.ACCOUNT_LOCKED]: 403,
  [ResponseCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ResponseCode.INVALID_SIGNATURE]: 401,
  
  // Error codes - Server
  [ResponseCode.INTERNAL_ERROR]: 500,
  [ResponseCode.SERVICE_UNAVAILABLE]: 503,
  [ResponseCode.DATABASE_ERROR]: 500,
  [ResponseCode.EXTERNAL_SERVICE_ERROR]: 502
};

/**
 * Format success response
 * @param {Object} res - Express response object
 * @param {string} code - Response code
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @param {Object} meta - Additional metadata (optional)
 */
export const successResponse = (res, code = ResponseCode.SUCCESS, message, data = null, meta = null) => {
  const statusCode = HTTP_STATUS_MAP[code] || 200;
  
  const response = {
    code,
    message,
    data
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Format error response
 * @param {Object} res - Express response object
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} errors - Detailed error information (optional)
 * @param {Object} meta - Additional metadata (optional)
 */
export const errorResponse = (res, code = ResponseCode.INTERNAL_ERROR, message, errors = null, meta = null) => {
  const statusCode = HTTP_STATUS_MAP[code] || 500;
  
  const response = {
    code,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  if (meta) {
    response.meta = meta;
  }
  
  // Log error untuk kode 5xx
  if (statusCode >= 500) {
    logger.error(`Error Response: ${code} - ${message}`);
    if (errors) {
      logger.error(JSON.stringify(errors));
    }
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Format Joi validation error
 * @param {Object} res - Express response object
 * @param {Object} error - Joi validation error
 */
export const validationErrorResponse = (res, error) => {
  const errors = error.details.map(detail => ({
    field: detail.context.key,
    message: detail.message,
    value: detail.context.value
  }));
  
  return errorResponse(
    res,
    ResponseCode.UNPROCESSABLE,
    'Validation failed',
    errors
  );
};

/**
 * Format service error response based on service result
 * @param {Object} res - Express response object
 * @param {Object} serviceResult - Result from service call
 */
export const serviceErrorResponse = (res, serviceResult) => {
  // Map service code to response code
  let responseCode;
  
  switch (serviceResult.code) {
    case 'INVALID_INPUT':
      responseCode = ResponseCode.BAD_REQUEST;
      break;
    case 'INVALID_CREDENTIALS':
      responseCode = ResponseCode.INVALID_CREDENTIALS;
      break;
    case 'USER_NOT_FOUND':
    case 'TOKEN_NOT_FOUND':
    case 'CONSUMER_NOT_FOUND':
    case 'KEY_NOT_FOUND':
      responseCode = ResponseCode.NOT_FOUND;
      break;
    case 'USERNAME_EXISTS':
    case 'EMAIL_EXISTS':
    case 'NAME_EXISTS':
      responseCode = ResponseCode.CONFLICT;
      break;
    case 'INVALID_TOKEN':
    case 'TOKEN_EXPIRED':
    case 'TOKEN_REVOKED':
      responseCode = ResponseCode.INVALID_TOKEN;
      break;
    case 'ACCOUNT_LOCKED':
      responseCode = ResponseCode.ACCOUNT_LOCKED;
      break;
    case 'INVALID_SIGNATURE':
      responseCode = ResponseCode.INVALID_SIGNATURE;
      break;
    case 'SYSTEM_ERROR':
    case 'DATABASE_ERROR':
      responseCode = ResponseCode.INTERNAL_ERROR;
      break;
    default:
      responseCode = ResponseCode.INTERNAL_ERROR;
  }
  
  return errorResponse(
    res,
    responseCode,
    serviceResult.message || 'An error occurred',
    serviceResult.errors
  );
};