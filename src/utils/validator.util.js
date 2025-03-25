 
/**
 * Middleware untuk validasi request menggunakan Joi
 */
import { validationErrorResponse } from '../utils/response.util.js';

/**
 * Validasi body request
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown keys
      presence: 'required' // By default, fields defined in the schema are required
    });
    
    if (error) {
      return validationErrorResponse(res, error);
    }
    
    // Replace the body with the validated value
    req.body = value;
    next();
  };
};

/**
 * Validasi query parameter
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      presence: 'optional' // By default, query parameters are optional
    });
    
    if (error) {
      return validationErrorResponse(res, error);
    }
    
    // Replace the query with the validated value
    req.query = value;
    next();
  };
};

/**
 * Validasi path parameter
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      presence: 'required' // Path parameters are typically required
    });
    
    if (error) {
      return validationErrorResponse(res, error);
    }
    
    // Replace the params with the validated value
    req.params = value;
    next();
  };
};

/**
 * Validasi header
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
export const validateHeaders = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.headers, {
      abortEarly: false,
      stripUnknown: false, // Don't strip unknown headers
      presence: 'optional' // Headers are typically optional
    });
    
    if (error) {
      return validationErrorResponse(res, error);
    }
    
    // We don't replace the headers object
    next();
  };
};