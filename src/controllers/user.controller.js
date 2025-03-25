 
/**
 * Controller untuk endpoint user
 */
import { 
    getUserById,
    listUsers,
    createUser,
    updateUser,
    changePassword,
    deleteUser
  } from '../services/user.service.js';
  import { getUserTokens, revokeAllUserTokens } from '../services/token.service.js';
  import { getUserLoginHistory } from '../services/audit.service.js';
  import { successResponse, errorResponse, serviceErrorResponse, ResponseCode } from '../utils/response.util.js';
  import { logger } from '../utils/logger.util.js';
  
  /**
   * Mendapatkan informasi detail pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const getUserDetail = async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Panggil layanan untuk mendapatkan data pengguna
      const result = await getUserById(userId);
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          'Data pengguna berhasil diambil',
          result.user
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Get user detail error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mengambil data pengguna'
      );
    }
  };
  
  /**
   * Mendapatkan daftar pengguna dengan filter dan pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const getUsers = async (req, res) => {
    try {
      // Extract query parameters
      const { 
        page, 
        limit, 
        sort_by, 
        sort_order, 
        username, 
        email, 
        is_active, 
        is_locked, 
        role 
      } = req.query;
      
      // Panggil layanan untuk mendapatkan daftar pengguna
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: sort_by || 'created_at',
        sortOrder: sort_order || 'DESC',
        filter: {
          username,
          email,
          isActive: is_active !== undefined ? is_active === 'true' : undefined,
          isLocked: is_locked !== undefined ? is_locked === 'true' : undefined,
          role
        }
      };
      
      const result = await listUsers(options);
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          'Daftar pengguna berhasil diambil',
          result.data,
          { pagination: result.pagination }
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Get users error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mengambil daftar pengguna'
      );
    }
  };
  
  /**
   * Membuat pengguna baru
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const addUser = async (req, res) => {
    try {
      const userData = req.body;
      
      // Panggil layanan untuk membuat pengguna baru
      const result = await createUser(userData, req.user.id);
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.CREATED,
          'Pengguna berhasil dibuat',
          result.user
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Create user error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat membuat pengguna baru'
      );
    }
  };
  
  /**
   * Mengupdate data pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const updateUserDetail = async (req, res) => {
    try {
      const { userId } = req.params;
      const userData = req.body;
      
      // Panggil layanan untuk mengupdate pengguna
      const result = await updateUser(userId, userData, req.user.id);
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          'Pengguna berhasil diperbarui',
          result.user
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Update user error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat memperbarui pengguna'
      );
    }
  };
  
  /**
   * Mengganti password pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const updatePassword = async (req, res) => {
    try {
      const { userId } = req.params;
      const passwordData = req.body;
      
      // Pastikan pengguna hanya bisa mengubah passwordnya sendiri
      if (userId !== req.user.id && !req.user.roles.includes('admin')) {
        return errorResponse(
          res,
          ResponseCode.FORBIDDEN,
          'Anda tidak memiliki izin untuk mengubah password pengguna lain'
        );
      }
      
      // Panggil layanan untuk mengubah password
      const result = await changePassword(userId, passwordData, req.user.id);
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          'Password berhasil diubah',
          null
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Change password error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mengubah password'
      );
    }
  };
  
  /**
   * Menghapus pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const removeUser = async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Panggil layanan untuk menghapus pengguna
      const result = await deleteUser(userId);
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          'Pengguna berhasil dihapus',
          null
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Delete user error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat menghapus pengguna'
      );
    }
  };
  
  /**
   * Mendapatkan daftar token aktif pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const getUserActiveTokens = async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Panggil layanan untuk mendapatkan token pengguna
      const result = await getUserTokens(userId);
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          'Daftar token pengguna berhasil diambil',
          result.tokens
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Get user tokens error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mengambil token pengguna'
      );
    }
  };
  
  /**
   * Mencabut semua token aktif pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const revokeUserTokens = async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Panggil layanan untuk mencabut semua token pengguna
      const result = await revokeAllUserTokens(userId);
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          `Berhasil mencabut ${result.count} token`,
          { revoked_count: result.count }
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Revoke user tokens error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mencabut token pengguna'
      );
    }
  };
  
  /**
   * Mendapatkan riwayat login pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const getUserLoginLogs = async (req, res) => {
    try {
      const { userId } = req.params;
      const { page, limit } = req.query;
      
      // Panggil layanan untuk mendapatkan riwayat login
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      };
      
      const result = await getUserLoginHistory(userId, options);
      
      // Kirim respons sesuai hasil
      if (result.success) {
        return successResponse(
          res, 
          ResponseCode.SUCCESS,
          'Riwayat login pengguna berhasil diambil',
          result.data,
          { pagination: result.pagination }
        );
      } else {
        return serviceErrorResponse(res, result);
      }
    } catch (error) {
      logger.error(`Get user login history error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mengambil riwayat login pengguna'
      );
    }
  };