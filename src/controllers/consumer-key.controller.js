/**
 * Controller untuk manajemen kunci consumer
 */
import { ConsumerModel } from '../models/index.model.js';
import { successResponse, errorResponse, ResponseCode } from '../utils/response.util.js';
import { logger } from '../utils/logger.util.js';

/**
 * Mendapatkan informasi kunci publik consumer saat ini
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCurrentConsumerPublicKey = async (req, res) => {
  try {
    // Mendapatkan consumer dari middleware authenticateApiKey
    const consumer = req.consumer;
    
    if (!consumer) {
      return errorResponse(
        res,
        ResponseCode.UNAUTHORIZED,
        'Consumer tidak terautentikasi'
      );
    }
    
    // Mendapatkan consumer dari database untuk memastikan data terbaru
    const consumerData = await ConsumerModel.findByPk(consumer.id);
    
    if (!consumerData) {
      return errorResponse(
        res,
        ResponseCode.NOT_FOUND,
        'Consumer tidak ditemukan'
      );
    }
    
    // Mendapatkan informasi kunci publik
    const keyInfo = {
      algorithm: consumerData.key_algorithm,
      version: consumerData.key_version,
      public_key: consumerData.public_key,
      consumer: {
        id: consumerData.id,
        name: consumerData.name
      }
    };
    
    return successResponse(
      res,
      ResponseCode.SUCCESS,
      'Informasi kunci publik consumer berhasil didapatkan',
      keyInfo
    );
  } catch (error) {
    logger.error(`Get consumer public key error: ${error.message}`);
    return errorResponse(
      res,
      ResponseCode.INTERNAL_ERROR,
      'Terjadi kesalahan saat mendapatkan informasi kunci publik consumer'
    );
  }
};