/**
 * Controller untuk endpoint MFA
 */
import { 
    setupTOTP, 
    verifyAndEnableTOTP, 
    disableMFA 
  } from '../services/mfa.service.js';
  import { 
    successResponse, 
    errorResponse, 
    serviceErrorResponse,
    ResponseCode 
  } from '../utils/response.util.js';
  import { logger } from '../utils/logger.util.js';
  
  /**
   * Setup TOTP untuk user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const setupTotpForUser = async (req, res) => {
    try {
      // Gunakan ID user dari token JWT
      const userId = req.user.id;
      
      const result = await setupTOTP(userId);
      
      if (result.success) {
        return successResponse(
          res,
          ResponseCode.SUCCESS,
          'TOTP setup berhasil dibuat',
          result.data
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`TOTP setup error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat setup TOTP'
      );
    }
  };
  
  /**
   * Verifikasi dan aktifkan TOTP
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const verifyAndEnableTotpForUser = async (req, res) => {
    try {
      const userId = req.user.id;
      const { token } = req.body;
      
      if (!token) {
        return errorResponse(
          res,
          ResponseCode.BAD_REQUEST,
          'Token TOTP diperlukan'
        );
      }
      
      const result = await verifyAndEnableTOTP(userId, token);
      
      if (result.success) {
        return successResponse(
          res,
          ResponseCode.SUCCESS,
          'TOTP berhasil diaktifkan',
          result.data
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`TOTP verification error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat verifikasi TOTP'
      );
    }
  };
  
  /**
   * Nonaktifkan MFA
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const disableMfaForUser = async (req, res) => {
    try {
      const userId = req.user.id;
      const { current_password } = req.body;
      
      if (!current_password) {
        return errorResponse(
          res,
          ResponseCode.BAD_REQUEST,
          'Password saat ini diperlukan'
        );
      }
      
      const result = await disableMFA(userId, current_password);
      
      if (result.success) {
        return successResponse(
          res,
          ResponseCode.SUCCESS,
          'MFA berhasil dinonaktifkan',
          null
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`MFA disable error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat menonaktifkan MFA'
      );
    }
  };