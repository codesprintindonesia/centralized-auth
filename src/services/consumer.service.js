/**
 * Layanan manajemen API consumer untuk aplikasi otentikasi terpusat
 */
import { 
    ConsumerModel, 
    TokenModel,
    sequelize 
  } from '../models/index.model.js';
  import { 
    generateRandomToken, 
    hashData,
    encryptSymmetric 
  } from './crypto.service.js';
  import { logger } from '../utils/logger.util.js';
  
  /**
   * Mendapatkan consumer berdasarkan ID
   * @param {string} consumerId - ID consumer
   * @returns {Promise<Object>} Data consumer
   */
  export const getConsumerById = async (consumerId) => {
    try {
      const consumer = await ConsumerModel.findByPk(consumerId);
      
      if (!consumer) {
        return {
          success: false,
          code: 'CONSUMER_NOT_FOUND',
          message: 'API consumer not found'
        };
      }
      
      return {
        success: true,
        consumer: {
          id: consumer.id,
          name: consumer.name,
          key_algorithm: consumer.key_algorithm,
          key_version: consumer.key_version,
          allowed_ips: consumer.allowed_ips,
          is_active: consumer.is_active,
          created_at: consumer.created_at,
          updated_at: consumer.updated_at
        }
      };
    } catch (error) {
      logger.error(`Error in getConsumerById: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Mendapatkan daftar consumers
   * @param {Object} options - Opsi paginasi dan filter
   * @returns {Promise<Object>} Daftar consumers
   */
  export const listConsumers = async (options = {}) => {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'name', 
      sortOrder = 'ASC',
      filter = {} 
    } = options;
    
    const offset = (page - 1) * limit;
    
    try {
      // Build where clause
      const where = {};
      
      if (filter.name) {
        where.name = { [sequelize.Op.iLike]: `%${filter.name}%` };
      }
      
      if (filter.isActive !== undefined) {
        where.is_active = filter.isActive;
      }
      
      // Execute query
      const { count, rows } = await ConsumerModel.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit,
        offset
      });
      
      // Format response
      const consumers = rows.map(consumer => ({
        id: consumer.id,
        name: consumer.name,
        key_algorithm: consumer.key_algorithm,
        key_version: consumer.key_version,
        allowed_ips: consumer.allowed_ips,
        is_active: consumer.is_active,
        created_at: consumer.created_at,
        updated_at: consumer.updated_at
      }));
      
      return {
        success: true,
        data: consumers,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error(`Error in listConsumers: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Membuat consumer baru
   * @param {Object} consumerData - Data consumer baru
   * @param {string} createdBy - ID pengguna yang membuat
   * @returns {Promise<Object>} Consumer yang dibuat dan API key
   */
  export const createConsumer = async (consumerData, createdBy) => {
    const { name, publicKey, keyAlgorithm = 'RSA-2048', allowedIps = [] } = consumerData;
    
    // Validasi input
    if (!name || !publicKey) {
      return {
        success: false,
        code: 'INVALID_INPUT',
        message: 'Name and public key are required'
      };
    }
    
    // Mulai transaksi database
    const transaction = await sequelize.transaction();
    
    try {
      // Cek apakah nama consumer sudah ada
      const existingConsumer = await ConsumerModel.findOne({ 
        where: { name },
        transaction
      });
      
      if (existingConsumer) {
        await transaction.rollback();
        return {
          success: false,
          code: 'NAME_EXISTS',
          message: 'Consumer name already exists'
        };
      }
      
      // Generate API key
      const apiKey = generateRandomToken(32);
      const apiKeySalt = generateRandomToken(8);
      const apiKeyHash = hashData(apiKey + apiKeySalt);
      
      // Buat consumer baru
      const consumer = await ConsumerModel.create({
        name,
        api_key_hash: apiKeyHash,
        api_key_salt: apiKeySalt,
        public_key: publicKey,
        key_algorithm: keyAlgorithm,
        key_version: 1,
        allowed_ips: allowedIps,
        is_active: true
      }, { transaction });
      
      // Commit transaksi
      await transaction.commit();
      
      logger.info(`API consumer created: ${name}`);
      
      return {
        success: true,
        consumer: {
          id: consumer.id,
          name: consumer.name,
          key_algorithm: consumer.key_algorithm,
          key_version: consumer.key_version,
          allowed_ips: consumer.allowed_ips,
          is_active: consumer.is_active,
          created_at: consumer.created_at
        },
        apiKey // Penting: API key hanya ditampilkan sekali, harus disimpan oleh client
      };
    } catch (error) {
      // Rollback transaksi jika terjadi error
      if (transaction) await transaction.rollback();
      
      logger.error(`Error in createConsumer: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Mengupdate consumer
   * @param {string} consumerId - ID consumer
   * @param {Object} consumerData - Data yang diupdate
   * @param {string} updatedBy - ID pengguna yang mengupdate
   * @returns {Promise<Object>} Consumer yang diupdate
   */
  export const updateConsumer = async (consumerId, consumerData, updatedBy) => {
    const { name, publicKey, keyAlgorithm, allowedIps, isActive } = consumerData;
    
    try {
      // Dapatkan consumer yang akan diupdate
      const consumer = await ConsumerModel.findByPk(consumerId);
      
      if (!consumer) {
        return {
          success: false,
          code: 'CONSUMER_NOT_FOUND',
          message: 'API consumer not found'
        };
      }
      
      // Persiapkan data yang akan diupdate
      const updateData = {};
      
      if (name !== undefined) {
        // Cek apakah nama sudah digunakan consumer lain
        if (name !== consumer.name) {
          const existingConsumer = await ConsumerModel.findOne({ 
            where: { 
              name,
              id: { [sequelize.Op.ne]: consumerId }
            }
          });
          
          if (existingConsumer) {
            return {
              success: false,
              code: 'NAME_EXISTS',
              message: 'Consumer name already exists'
            };
          }
          
          updateData.name = name;
        }
      }
      
      if (publicKey !== undefined) {
        updateData.public_key = publicKey;
        updateData.key_version = consumer.key_version + 1;
      }
      
      if (keyAlgorithm !== undefined) {
        updateData.key_algorithm = keyAlgorithm;
      }
      
      if (allowedIps !== undefined) {
        updateData.allowed_ips = allowedIps;
      }
      
      if (isActive !== undefined) {
        updateData.is_active = isActive;
        
        // Jika consumer dinonaktifkan, revoke semua token terkait
        if (isActive === false) {
          await TokenModel.update(
            { is_revoked: true, revoked_at: new Date() },
            { where: { consumer_id: consumerId, is_revoked: false } }
          );
        }
      }
      
      // Update consumer jika ada data yang diubah
      if (Object.keys(updateData).length > 0) {
        await consumer.update(updateData);
      }
      
      logger.info(`API consumer updated: ${consumer.name}`);
      
      return {
        success: true,
        consumer: {
          id: consumer.id,
          name: consumer.name,
          key_algorithm: consumer.key_algorithm,
          key_version: consumer.key_version,
          allowed_ips: consumer.allowed_ips,
          is_active: consumer.is_active,
          updated_at: consumer.updated_at
        }
      };
    } catch (error) {
      logger.error(`Error in updateConsumer: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Mengganti API key consumer
   * @param {string} consumerId - ID consumer
   * @returns {Promise<Object>} API key baru
   */
  export const regenerateApiKey = async (consumerId) => {
    try {
      // Dapatkan consumer
      const consumer = await ConsumerModel.findByPk(consumerId);
      
      if (!consumer) {
        return {
          success: false,
          code: 'CONSUMER_NOT_FOUND',
          message: 'API consumer not found'
        };
      }
      
      // Generate API key baru
      const apiKey = generateRandomToken(32);
      const apiKeySalt = generateRandomToken(8);
      const apiKeyHash = hashData(apiKey + apiKeySalt);
      
      // Update API key consumer
      await consumer.update({
        api_key_hash: apiKeyHash,
        api_key_salt: apiKeySalt
      });
      
      // Revoke semua token terkait
      await TokenModel.update(
        { is_revoked: true, revoked_at: new Date() },
        { where: { consumer_id: consumerId, is_revoked: false } }
      );
      
      logger.info(`API key regenerated for consumer: ${consumer.name}`);
      
      return {
        success: true,
        apiKey, // Penting: API key hanya ditampilkan sekali, harus disimpan oleh client
        message: 'API key successfully regenerated. All existing tokens have been revoked.'
      };
    } catch (error) {
      logger.error(`Error in regenerateApiKey: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Menghapus consumer
   * @param {string} consumerId - ID consumer
   * @returns {Promise<Object>} Hasil operasi
   */
  export const deleteConsumer = async (consumerId) => {
    try {
      const consumer = await ConsumerModel.findByPk(consumerId);
      
      if (!consumer) {
        return {
          success: false,
          code: 'CONSUMER_NOT_FOUND',
          message: 'API consumer not found'
        };
      }
      
      // Hapus consumer
      await consumer.destroy();
      
      logger.info(`API consumer deleted: ${consumer.name}`);
      
      return {
        success: true,
        message: 'API consumer successfully deleted'
      };
    } catch (error) {
      logger.error(`Error in deleteConsumer: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Memverifikasi API key
   * @param {string} apiKey - API key dari request
   * @param {string} consumerName - Nama consumer
   * @returns {Promise<Object>} Hasil verifikasi
   */
  export const verifyApiKey = async (apiKey, consumerName) => {
    try {
      // Dapatkan consumer
      const consumer = await ConsumerModel.findOne({
        where: { name: consumerName, is_active: true }
      });
      
      if (!consumer) {
        return {
          success: false,
          code: 'CONSUMER_NOT_FOUND',
          message: 'API consumer not found or inactive'
        };
      }
      
      // Verifikasi API key
      const apiKeyHash = hashData(apiKey + consumer.api_key_salt);
      const isValid = apiKeyHash === consumer.api_key_hash;
      
      if (!isValid) {
        return {
          success: false,
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        };
      }
      
      return {
        success: true,
        consumer: {
          id: consumer.id,
          name: consumer.name,
          key_algorithm: consumer.key_algorithm
        }
      };
    } catch (error) {
      logger.error(`Error in verifyApiKey: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };