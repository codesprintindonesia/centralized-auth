/**
 * Controller untuk endpoint otentikasi
 */
import { 
    authenticateUser, 
    verifyToken, 
    revokeToken, 
    revokeAllTokensForUser 
  } from '../services/auth.service.js';
  import { logLoginActivity, logLogoutActivity } from '../services/audit.service.js';
  import { successResponse, errorResponse, serviceErrorResponse, ResponseCode } from '../utils/response.util.js';
  import { logger } from '../utils/logger.util.js';
  
  /**
   * Login pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const login = async (req, res) => {
    try {
      const { username, password, mfa_code } = req.body;
      
      // Siapkan konteks otentikasi
      const context = {
        consumerId: req.consumer.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        signatureHeader: req.headers['x-signature']
      };
      
      // Panggil layanan otentikasi
      const result = await authenticateUser({ username, password, mfa_code }, context);
      
      // Log aktivitas login
      await logLoginActivity({
        userId: result.success ? result.user.id : null,
        username,
        consumerId: req.consumer.id,
        consumerName: req.consumer.name,
        success: result.success,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        reason: result.success ? null : result.code,
        signatureStatus: req.signatureVerified ? 'valid' : 'missing'
      });
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          'Login berhasil',
          {
            token: result.token,
            expires_at: result.expiresAt,
            user: result.user
          }
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat proses login'
      );
    }
  };
  
  /**
   * Verifikasi token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const verify = async (req, res) => {
    try {
      const { token } = req.body;
      
      // Panggil layanan verifikasi token
      const result = await verifyToken(token, req.consumer.id);
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          'Token valid',
          {
            user: result.user
          }
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Token verification error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat memverifikasi token'
      );
    }
  };
  
  /**
   * Logout pengguna (revoke token)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const logout = async (req, res) => {
    try {
      const { token, all_devices } = req.body;
      
      // Siapkan konteks
      const context = {
        userId: req.user.id,
        reason: 'User logout',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };
      
      let result;
      
      // Revoke semua token atau token spesifik
      if (all_devices) {
        result = await revokeAllTokensForUser(req.user.id, context);
      } else {
        // Extrak token ID dari JWT
        const decoded = jwt.decode(token || req.headers.authorization.split(' ')[1]);
        result = await revokeToken(decoded.token_id, context);
      }
      
      // Log aktivitas logout
      await logLogoutActivity({
        userId: req.user.id,
        consumerId: req.consumer.id,
        tokenId: context.tokenId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        signatureStatus: req.signatureVerified ? 'valid' : 'missing'
      });
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          all_devices ? 'Logout dari semua perangkat berhasil' : 'Logout berhasil',
          { revoked_count: result.count || 1 }
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Logout error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat proses logout'
      );
    }
  };
  
  /**
   * Mendapatkan informasi pengguna yang sedang login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const me = async (req, res) => {
    try {
      // Informasi pengguna sudah tersedia di req.user dari middleware authenticateJwt
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Data pengguna berhasil diambil',
        {
          user: req.user
        }
      );
    } catch (error) {
      logger.error(`Get current user error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mengambil data pengguna'
      );
    }
  };