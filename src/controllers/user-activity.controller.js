/**
 * Controller untuk user activity log
 */
import { AuditLogModel, UserModel, sequelize } from '../models/index.model.js';
import { successResponse, errorResponse, ResponseCode } from '../utils/response.util.js';
import { logger } from '../utils/logger.util.js';

/**
 * Mendapatkan log aktivitas pengguna
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserActivityLog = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      event_type = 'all',
      start_date,
      end_date 
    } = req.query;
    
    // Cek apakah pengguna ada
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return errorResponse(
        res,
        ResponseCode.NOT_FOUND,
        'Pengguna tidak ditemukan'
      );
    }
    
    // Siapkan filter untuk query
    const where = { user_id: userId };
    
    if (event_type !== 'all') {
      where.event_type = event_type;
    }
    
    // Filter berdasarkan tanggal jika ada
    if (start_date || end_date) {
      where.created_at = {};
      
      if (start_date) {
        where.created_at[sequelize.Op.gte] = new Date(start_date);
      }
      
      if (end_date) {
        where.created_at[sequelize.Op.lte] = new Date(end_date);
      }
    }
    
    // Kalkulasi offset untuk pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Query log aktivitas
    const { count, rows } = await AuditLogModel.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    // Format response
    const activities = rows.map(log => ({
      id: log.id,
      event_type: log.event_type,
      status: log.status,
      timestamp: log.created_at,
      metadata: log.metadata,
      signature_status: log.signature_status
    }));
    
    // Format pagination data
    const pagination = {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit))
    };
    
    return successResponse(
      res,
      ResponseCode.SUCCESS,
      'Log aktivitas pengguna berhasil diambil',
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        activities
      },
      { pagination }
    );
  } catch (error) {
    logger.error(`Get user activity log error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengambil log aktivitas pengguna'
    );
  }
};