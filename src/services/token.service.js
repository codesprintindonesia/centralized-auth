 
/**
 * Layanan manajemen token untuk aplikasi otentikasi terpusat
 */
import { 
    TokenModel, 
    UserModel, 
    ConsumerModel,
    ProviderKeyModel,
    sequelize 
  } from '../models/index.model.js';
  import { generateRandomToken, hashData, signData } from './crypto.service.js';
  import { logger } from '../utils/logger.util.js';
  
  /**
   * Membuat token baru
   * @param {string} userId - ID pengguna
   * @param {string} consumerId - ID consumer
   * @param {Object} metadata - Metadata token
   * @returns {Promise<Object>} Token yang dibuat
   */
  export const createToken = async (userId, consumerId, metadata = {}) => {
    try {
      // Periksa pengguna
      const user = await UserModel.findByPk(userId);
      if (!user || !user.is_active || user.is_locked) {
        return {
          success: false,
          code: 'INVALID_USER',
          message: 'User not found or inactive'
        };
      }
  
      // Periksa consumer
      const consumer = await ConsumerModel.findByPk(consumerId);
      if (!consumer || !consumer.is_active) {
        return {
          success: false,
          code: 'INVALID_CONSUMER',
          message: 'API consumer not found or inactive'
        };
      }
  
      // Dapatkan kunci provider aktif
      const providerKey = await ProviderKeyModel.findActiveKey();
      if (!providerKey) {
        logger.error('No active provider key found for signing');
        return {
          success: false,
          code: 'CONFIGURATION_ERROR',
          message: 'System configuration error: No active signing key'
        };
      }
  
      // Buat token baru
      const tokenValue = generateRandomToken(32);
      const tokenHash = hashData(tokenValue);
      
      // Set waktu kedaluwarsa (default 1 jam)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
  
      // Data untuk tanda tangan
      const signatureData = JSON.stringify({
        userId,
        consumerId,
        tokenHash,
        expiresAt: expiresAt.toISOString()
      });
  
      // Tanda tangan token (disederhanakan untuk demo)
      const signature = 'simulated-signature-' + generateRandomToken(8);
  
      // Simpan token ke database
      const token = await TokenModel.create({
        user_id: userId,
        consumer_id: consumerId,
        token_hash: tokenHash,
        signature,
        provider_key_id: providerKey.id,
        expires_at: expiresAt,
        metadata: {
          created_at: new Date(),
          ...metadata
        }
      });
  
      logger.info(`Token created for user ${userId} and consumer ${consumerId}`);
  
      return {
        success: true,
        token: {
          id: token.id,
          value: tokenValue,
          expiresAt
        }
      };
    } catch (error) {
      logger.error(`Error in createToken: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Mendapatkan token berdasarkan ID
   * @param {string} tokenId - ID token
   * @returns {Promise<Object>} Data token
   */
  export const getTokenById = async (tokenId) => {
    try {
      const token = await TokenModel.findByPk(tokenId, {
        include: [
          {
            model: UserModel,
            as: 'User',
            attributes: ['id', 'username']
          },
          {
            model: ConsumerModel,
            as: 'Consumer',
            attributes: ['id', 'name']
          }
        ]
      });
  
      if (!token) {
        return {
          success: false,
          code: 'TOKEN_NOT_FOUND',
          message: 'Token not found'
        };
      }
  
      return {
        success: true,
        token: {
          id: token.id,
          user: {
            id: token.User.id,
            username: token.User.username
          },
          consumer: {
            id: token.Consumer.id,
            name: token.Consumer.name
          },
          expiresAt: token.expires_at,
          isRevoked: token.is_revoked,
          revokedAt: token.revoked_at,
          createdAt: token.created_at,
          metadata: token.metadata
        }
      };
    } catch (error) {
      logger.error(`Error in getTokenById: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Mendapatkan semua token untuk pengguna
   * @param {string} userId - ID pengguna
   * @returns {Promise<Object>} Daftar token
   */
  export const getUserTokens = async (userId) => {
    try {
      const tokens = await TokenModel.findActiveTokensByUser(userId);
  
      return {
        success: true,
        tokens: tokens.map(token => ({
          id: token.id,
          consumer: {
            id: token.Consumer.id,
            name: token.Consumer.name
          },
          expiresAt: token.expires_at,
          createdAt: token.created_at,
          metadata: token.metadata
        }))
      };
    } catch (error) {
      logger.error(`Error in getUserTokens: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Mencabut token berdasarkan ID
   * @param {string} tokenId - ID token
   * @returns {Promise<Object>} Hasil pencabutan
   */
  export const revokeToken = async (tokenId) => {
    try {
      const revoked = await TokenModel.revokeById(tokenId);
  
      if (!revoked) {
        return {
          success: false,
          code: 'TOKEN_NOT_FOUND',
          message: 'Token not found or already revoked'
        };
      }
  
      logger.info(`Token ${tokenId} revoked`);
  
      return {
        success: true,
        message: 'Token successfully revoked'
      };
    } catch (error) {
      logger.error(`Error in revokeToken: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Mencabut semua token untuk pengguna
   * @param {string} userId - ID pengguna
   * @returns {Promise<Object>} Hasil pencabutan
   */
  export const revokeAllUserTokens = async (userId) => {
    try {
      const count = await TokenModel.revokeAllForUser(userId);
  
      logger.info(`All tokens (${count}) for user ${userId} revoked`);
  
      return {
        success: true,
        message: `Successfully revoked ${count} tokens`,
        count
      };
    } catch (error) {
      logger.error(`Error in revokeAllUserTokens: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Pembersihan token kedaluwarsa atau dicabut
   * @param {number} olderThanDays - Hari
   * @returns {Promise<Object>} Hasil pembersihan
   */
  export const cleanupExpiredTokens = async (olderThanDays = 30) => {
    try {
      const count = await TokenModel.cleanupExpired(olderThanDays);
  
      logger.info(`Cleaned up ${count} expired tokens`);
  
      return {
        success: true,
        message: `Successfully cleaned up ${count} expired tokens`,
        count
      };
    } catch (error) {
      logger.error(`Error in cleanupExpiredTokens: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Validasi token dari header
   * @param {string} tokenHeader - Token dari header
   * @returns {Promise<Object>} Hasil validasi
   */
  export const validateTokenFromHeader = async (tokenHeader) => {
    try {
      if (!tokenHeader) {
        return {
          success: false,
          code: 'TOKEN_MISSING',
          message: 'Authentication token is missing'
        };
      }
  
      // Format: Bearer <token>
      const parts = tokenHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return {
          success: false,
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid token format'
        };
      }
  
      const tokenValue = parts[1];
      const tokenHash = hashData(tokenValue);
  
      // Find token in database
      const token = await TokenModel.findByTokenHash(tokenHash);
      if (!token) {
        return {
          success: false,
          code: 'TOKEN_NOT_FOUND',
          message: 'Token not found or expired'
        };
      }
  
      // Get user data
      const user = await UserModel.findByPk(token.user_id);
      if (!user || !user.is_active) {
        return {
          success: false,
          code: 'USER_INACTIVE',
          message: 'User is inactive'
        };
      }
  
      return {
        success: true,
        token,
        user
      };
    } catch (error) {
      logger.error(`Error in validateTokenFromHeader: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };