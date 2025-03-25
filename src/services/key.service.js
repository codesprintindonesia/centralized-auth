/**
 * Layanan manajemen kunci untuk aplikasi otentikasi terpusat
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProviderKeyModel, sequelize } from '../models/index.model.js';
import { 
  generateRsaKeyPair, 
  encryptPrivateKey, 
  decryptPrivateKey, 
  signData 
} from './crypto.service.js';
import { logger } from '../utils/logger.util.js';

// Mendapatkan __dirname equivalent di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mendapatkan kunci provider aktif
 * @returns {Promise<Object>} Kunci aktif
 */
export const getActiveProviderKey = async () => {
  try {
    const key = await ProviderKeyModel.findActiveKey();
    
    if (!key) {
      return {
        success: false,
        code: 'KEY_NOT_FOUND',
        message: 'No active provider key found'
      };
    }
    
    return {
      success: true,
      key: {
        id: key.id,
        public_key: key.public_key,
        key_algorithm: key.key_algorithm,
        key_version: key.key_version,
        status: key.status,
        valid_from: key.valid_from,
        valid_until: key.valid_until,
        created_at: key.created_at
      }
    };
  } catch (error) {
    logger.error(`Error in getActiveProviderKey: ${error.message}`);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      message: 'An internal system error occurred'
    };
  }
};

/**
 * Mendapatkan daftar kunci provider
 * @returns {Promise<Object>} Daftar kunci
 */
export const listProviderKeys = async () => {
  try {
    const keys = await ProviderKeyModel.findAll({
      order: [
        ['status', 'ASC'],
        ['key_version', 'DESC']
      ]
    });
    
    return {
      success: true,
      keys: keys.map(key => ({
        id: key.id,
        public_key: key.public_key,
        key_algorithm: key.key_algorithm,
        key_version: key.key_version,
        status: key.status,
        valid_from: key.valid_from,
        valid_until: key.valid_until,
        created_at: key.created_at
      }))
    };
  } catch (error) {
    logger.error(`Error in listProviderKeys: ${error.message}`);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      message: 'An internal system error occurred'
    };
  }
};

/**
 * Melakukan rotasi kunci provider
 * @param {Object} options - Opsi rotasi kunci
 * @param {string} adminId - ID admin yang melakukan rotasi
 * @returns {Promise<Object>} Kunci baru
 */
export const rotateProviderKey = async (options, adminId) => {
  const { 
    keyAlgorithm = 'RSA-2048', 
    passphrase = process.env.KEY_PASSPHRASE || 'default-passphrase',
    validDays = 90
  } = options;
  
  try {
    // Generate pasangan kunci baru
    const { publicKey, privateKey } = generateRsaKeyPair(
      keyAlgorithm === 'RSA-4096' ? 4096 : 2048
    );
    
    // Enkripsi private key dengan passphrase
    const privateKeyEncrypted = encryptPrivateKey(privateKey, passphrase);
    
    // Simpan kunci ke disk jika folder dikonfigurasi
    const keyStoragePath = process.env.KEY_STORAGE_PATH;
    if (keyStoragePath) {
      const storageDir = path.resolve(keyStoragePath);
      
      // Buat direktori jika belum ada
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      
      // Nama file dengan timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const publicKeyPath = path.join(storageDir, `public_key_${timestamp}.pem`);
      const privateKeyPath = path.join(storageDir, `private_key_${timestamp}.encrypted.pem`);
      
      // Tulis kunci ke file
      fs.writeFileSync(publicKeyPath, publicKey);
      fs.writeFileSync(privateKeyPath, privateKeyEncrypted);
      
      logger.info(`Key pair saved to: ${storageDir}`);
    }
    
    // Rotasi kunci di database
    const newKey = await ProviderKeyModel.rotateKey(
      publicKey,
      privateKeyEncrypted,
      keyAlgorithm,
      adminId
    );
    
    logger.info(`Provider key rotated to version ${newKey.key_version}`);
    
    return {
      success: true,
      key: {
        id: newKey.id,
        public_key: newKey.public_key,
        key_algorithm: newKey.key_algorithm,
        key_version: newKey.key_version,
        status: newKey.status,
        valid_from: newKey.valid_from,
        valid_until: newKey.valid_until,
        created_at: newKey.created_at
      }
    };
  } catch (error) {
    logger.error(`Error in rotateProviderKey: ${error.message}`);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      message: 'An internal system error occurred'
    };
  }
};

/**
 * Mencabut kunci provider
 * @param {string} keyId - ID kunci
 * @param {string} adminId - ID admin yang mencabut
 * @returns {Promise<Object>} Hasil operasi
 */
export const revokeProviderKey = async (keyId, adminId) => {
  try {
    const revoked = await ProviderKeyModel.revokeKey(keyId, adminId);
    
    if (!revoked) {
      return {
        success: false,
        code: 'KEY_NOT_FOUND',
        message: 'Key not found or already revoked'
      };
    }
    
    logger.info(`Provider key ${keyId} revoked`);
    
    return {
      success: true,
      message: 'Key successfully revoked'
    };
  } catch (error) {
    logger.error(`Error in revokeProviderKey: ${error.message}`);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      message: 'An internal system error occurred'
    };
  }
};

/**
 * Menandatangani data menggunakan kunci privat provider
 * @param {string} data - Data yang akan ditandatangani
 * @param {Object} options - Opsi penandatanganan
 * @returns {Promise<Object>} Hasil tanda tangan
 */
export const signWithProviderKey = async (data, options = {}) => {
  const { keyId, passphrase = process.env.KEY_PASSPHRASE || 'default-passphrase' } = options;
  
  try {
    // Dapatkan kunci aktif atau kunci spesifik jika ID diberikan
    const key = keyId
      ? await ProviderKeyModel.findByPk(keyId)
      : await ProviderKeyModel.findActiveKey();
    
    if (!key) {
      return {
        success: false,
        code: 'KEY_NOT_FOUND',
        message: 'Signing key not found'
      };
    }
    
    if (key.status !== 'active') {
      return {
        success: false,
        code: 'KEY_INACTIVE',
        message: 'Signing key is not active'
      };
    }
    
    // Dekripsi private key
    const privateKey = decryptPrivateKey(key.private_key_encrypted, passphrase);
    
    // Tanda tangani data
    const signature = signData(data, privateKey);
    
    return {
      success: true,
      signature,
      keyId: key.id,
      keyVersion: key.key_version,
      algorithm: key.key_algorithm
    };
  } catch (error) {
    logger.error(`Error in signWithProviderKey: ${error.message}`);
    return {
      success: false,
      code: 'SIGNING_ERROR',
      message: 'Failed to sign data'
    };
  }
};

/**
 * Cek dan rotasi kunci yang hampir kedaluwarsa
 * @param {string} adminId - ID admin untuk rotasi
 * @returns {Promise<Object>} Hasil operasi
 */
export const checkAndRotateExpiringKeys = async (adminId) => {
  try {
    const now = new Date();
    const warningDays = 10; // Rotasi kunci yang akan kedaluwarsa dalam 10 hari
    
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);
    
    // Cari kunci aktif yang hampir kedaluwarsa
    const expiringKeys = await ProviderKeyModel.findAll({
      where: {
        status: 'active',
        valid_until: {
          [sequelize.Op.not]: null,
          [sequelize.Op.lt]: warningDate,
          [sequelize.Op.gt]: now
        }
      }
    });
    
    if (expiringKeys.length === 0) {
      return {
        success: true,
        message: 'No keys need rotation',
        rotated: 0
      };
    }
    
    // Rotasi kunci jika ditemukan
    let rotated = 0;
    for (const key of expiringKeys) {
      const result = await rotateProviderKey(
        { keyAlgorithm: key.key_algorithm }, 
        adminId
      );
      
      if (result.success) {
        rotated++;
      }
    }
    
    return {
      success: true,
      message: `Rotated ${rotated} expiring keys`,
      rotated
    };
  } catch (error) {
    logger.error(`Error in checkAndRotateExpiringKeys: ${error.message}`);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      message: 'An internal system error occurred'
    };
  }
};