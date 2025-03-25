/**
 * Controller untuk endpoint admin
 */
import jwt from 'jsonwebtoken';
import { 
  listConsumers,
  getConsumerById,
  createConsumer,
  updateConsumer,
  regenerateApiKey,
  deleteConsumer
} from '../services/consumer.service.js';
import {
  listProviderKeys,
  getActiveProviderKey,
  rotateProviderKey,
  revokeProviderKey
} from '../services/key.service.js';
import { getSecurityActivity, getSecurityStats } from '../services/audit.service.js';
import { cleanupExpiredTokens } from '../services/token.service.js';
import { successResponse, errorResponse, serviceErrorResponse, ResponseCode } from '../utils/response.util.js';
import { logger } from '../utils/logger.util.js';

// ========== Consumer Management ==========

/**
 * Mendapatkan daftar API consumer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getConsumers = async (req, res) => {
  try {
    // Extract query parameters
    const { 
      page, 
      limit, 
      sort_by, 
      sort_order, 
      name, 
      is_active 
    } = req.query;
    
    // Panggil layanan untuk mendapatkan daftar consumer
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sortBy: sort_by || 'name',
      sortOrder: sort_order || 'ASC',
      filter: {
        name,
        isActive: is_active !== undefined ? is_active === 'true' : undefined
      }
    };
    
    const result = await listConsumers(options);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'Daftar API consumer berhasil diambil',
        result.data,
        { pagination: result.pagination }
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Get consumers error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengambil daftar API consumer'
    );
  }
};

/**
 * Mendapatkan detail API consumer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getConsumerDetail = async (req, res) => {
  try {
    const { consumerId } = req.params;
    
    // Panggil layanan untuk mendapatkan detail consumer
    const result = await getConsumerById(consumerId);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'Detail API consumer berhasil diambil',
        result.consumer
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Get consumer detail error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengambil detail API consumer'
    );
  }
};

/**
 * Membuat API consumer baru
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addConsumer = async (req, res) => {
  try {
    const consumerData = req.body;
    
    // Panggil layanan untuk membuat consumer baru
    const result = await createConsumer(consumerData, req.user.id);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.CREATED,
        'API consumer berhasil dibuat',
        {
          consumer: result.consumer,
          api_key: result.apiKey // API key hanya ditampilkan sekali
        }
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Create consumer error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat membuat API consumer baru'
    );
  }
};

/**
 * Mengupdate API consumer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateConsumerDetail = async (req, res) => {
  try {
    const { consumerId } = req.params;
    const consumerData = req.body;
    
    // Panggil layanan untuk mengupdate consumer
    const result = await updateConsumer(consumerId, consumerData, req.user.id);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'API consumer berhasil diperbarui',
        result.consumer
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Update consumer error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat memperbarui API consumer'
    );
  }
};

/**
 * Mengenerate ulang API key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const regenerateConsumerApiKey = async (req, res) => {
  try {
    const { consumerId } = req.params;
    
    // Panggil layanan untuk mengenerate ulang API key
    const result = await regenerateApiKey(consumerId);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'API key berhasil digenerate ulang',
        {
          api_key: result.apiKey // API key hanya ditampilkan sekali
        }
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Regenerate API key error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengenerate ulang API key'
    );
  }
};

/**
 * Menghapus API consumer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const removeConsumer = async (req, res) => {
  try {
    const { consumerId } = req.params;
    
    // Panggil layanan untuk menghapus consumer
    const result = await deleteConsumer(consumerId);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'API consumer berhasil dihapus',
        null
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Delete consumer error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat menghapus API consumer'
    );
  }
};

// ========== Key Management ==========

/**
 * Mendapatkan daftar kunci provider
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getProviderKeys = async (req, res) => {
  try {
    // Panggil layanan untuk mendapatkan daftar kunci
    const result = await listProviderKeys();
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'Daftar kunci provider berhasil diambil',
        result.keys
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Get provider keys error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengambil daftar kunci provider'
    );
  }
};

/**
 * Mendapatkan kunci provider aktif
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getActiveKey = async (req, res) => {
  try {
    // Panggil layanan untuk mendapatkan kunci aktif
    const result = await getActiveProviderKey();
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'Kunci provider aktif berhasil diambil',
        result.key
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Get active provider key error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengambil kunci provider aktif'
    );
  }
};

/**
 * Melakukan rotasi kunci provider
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const rotateKey = async (req, res) => {
  try {
    const { keyAlgorithm, validDays } = req.body;
    
    // Panggil layanan untuk rotasi kunci
    const options = {
      keyAlgorithm,
      validDays: parseInt(validDays) || 90,
      passphrase: process.env.KEY_PASSPHRASE
    };
    
    const result = await rotateProviderKey(options, req.user.id);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'Rotasi kunci provider berhasil dilakukan',
        result.key
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Rotate provider key error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat melakukan rotasi kunci provider'
    );
  }
};

/**
 * Mencabut kunci provider
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const revokeKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    
    // Panggil layanan untuk mencabut kunci
    const result = await revokeProviderKey(keyId, req.user.id);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'Kunci provider berhasil dicabut',
        null
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Revoke provider key error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mencabut kunci provider'
    );
  }
};

// ========== Security Audit ==========

/**
 * Mendapatkan aktivitas keamanan
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSecurityLogs = async (req, res) => {
  try {
    // Extract query parameters
    const { 
      page, 
      limit, 
      user_id,
      consumer_id,
      event_type,
      status,
      start_date,
      end_date
    } = req.query;
    
    // Panggil layanan untuk mendapatkan aktivitas keamanan
    const filters = {
      userId: user_id,
      consumerId: consumer_id,
      eventType: event_type,
      status,
      startDate: start_date,
      endDate: end_date
    };
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    };
    
    const result = await getSecurityActivity(filters, options);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'Aktivitas keamanan berhasil diambil',
        result.data,
        { pagination: result.pagination }
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Get security logs error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengambil aktivitas keamanan'
    );
  }
};

/**
 * Mendapatkan statistik keamanan
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAuditStats = async (req, res) => {
  try {
    // Extract query parameters
    const { start_date, end_date } = req.query;
    
    // Panggil layanan untuk mendapatkan statistik keamanan
    const filters = {
      startDate: start_date,
      endDate: end_date
    };
    
    const result = await getSecurityStats(filters);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'Statistik keamanan berhasil diambil',
        result.data
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Get security stats error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mengambil statistik keamanan'
    );
  }
};

// ========== Maintenance ==========

/**
 * Membersihkan token kedaluwarsa
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const cleanupTokens = async (req, res) => {
  try {
    // Extract query parameters
    const { older_than_days } = req.query;
    
    // Panggil layanan untuk membersihkan token
    const result = await cleanupExpiredTokens(parseInt(older_than_days) || 30);
    
    // Kirim respons sesuai hasil
    if (result.success) {
      return successResponse(
        res, 
        ResponseCode.SUCCESS,
        'Token kedaluwarsa berhasil dibersihkan',
        { deleted_count: result.count }
      );
    } else {
      return serviceErrorResponse(res, result);
    }
  } catch (error) {
    logger.error(`Cleanup tokens error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat membersihkan token kedaluwarsa'
    );
  }
};