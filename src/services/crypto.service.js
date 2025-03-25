 
/**
 * Layanan untuk operasi kriptografi pada aplikasi otentikasi terpusat
 */
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import NodeRSA from 'node-rsa';
import { promisify } from 'util';
import { logger } from '../utils/logger.util.js';

// Promisify bcrypt functions
const hashAsync = promisify(bcrypt.hash);
const compareAsync = promisify(bcrypt.compare);

// Konfigurasi bcrypt
const SALT_ROUNDS = 10;

/**
 * Membuat hash password menggunakan bcrypt
 * @param {string} password - Password plain text yang akan di-hash
 * @returns {Promise<Object>} Object berisi hash dan salt
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await hashAsync(password, salt);
    return { hash, salt };
  } catch (error) {
    logger.error(`Error hashing password: ${error.message}`);
    throw new Error('Failed to hash password');
  }
};

/**
 * Verifikasi password dengan hash yang disimpan
 * @param {string} password - Password plain text yang akan diverifikasi
 * @param {string} hash - Hash password yang tersimpan
 * @returns {Promise<boolean>} Hasil verifikasi
 */
export const verifyPassword = async (password, hash) => {
  try {
    return await compareAsync(password, hash);
  } catch (error) {
    logger.error(`Error verifying password: ${error.message}`);
    throw new Error('Failed to verify password');
  }
};

/**
 * Encrypt data simetris menggunakan AES-256
 * @param {string} data - Data yang akan dienkripsi
 * @param {string} secret - Secret key
 * @returns {string} Data terenkripsi (hex)
 */
export const encryptSymmetric = (data, secret) => {
  try {
    // Derive key and iv from secret
    const key = crypto.scryptSync(secret, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend iv to encrypted data (iv is needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    logger.error(`Error encrypting data: ${error.message}`);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data simetris yang dienkripsi dengan AES-256
 * @param {string} encryptedData - Data terenkripsi (hex)
 * @param {string} secret - Secret key
 * @returns {string} Data terdekripsi
 */
export const decryptSymmetric = (encryptedData, secret) => {
  try {
    // Split iv and encrypted data
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Derive key from secret
    const key = crypto.scryptSync(secret, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error(`Error decrypting data: ${error.message}`);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Membuat pasangan kunci RSA baru
 * @param {number} keySize - Ukuran kunci dalam bit
 * @returns {Object} Pasangan kunci { publicKey, privateKey }
 */
export const generateRsaKeyPair = (keySize = 2048) => {
  try {
    const key = new NodeRSA({ b: keySize });
    return {
      publicKey: key.exportKey('public'),
      privateKey: key.exportKey('private')
    };
  } catch (error) {
    logger.error(`Error generating RSA key pair: ${error.message}`);
    throw new Error('Failed to generate RSA key pair');
  }
};

/**
 * Mengenkripsi private key dengan passphrase
 * @param {string} privateKey - Private key yang akan dienkripsi
 * @param {string} passphrase - Passphrase untuk enkripsi
 * @returns {string} Private key terenkripsi
 */
export const encryptPrivateKey = (privateKey, passphrase) => {
  return encryptSymmetric(privateKey, passphrase);
};

/**
 * Mendekripsi private key yang sudah dienkripsi
 * @param {string} encryptedPrivateKey - Private key terenkripsi
 * @param {string} passphrase - Passphrase untuk dekripsi
 * @returns {string} Private key terdekripsi
 */
export const decryptPrivateKey = (encryptedPrivateKey, passphrase) => {
  return decryptSymmetric(encryptedPrivateKey, passphrase);
};

/**
 * Buat tanda tangan digital (signature) menggunakan private key
 * @param {string} data - Data yang akan ditandatangani
 * @param {string} privateKey - Private key untuk penandatanganan
 * @returns {string} Tanda tangan digital (base64)
 */
export const signData = (data, privateKey) => {
  try {
    const key = new NodeRSA(privateKey);
    const signature = key.sign(Buffer.from(data), 'base64', 'utf8');
    return signature;
  } catch (error) {
    logger.error(`Error signing data: ${error.message}`);
    throw new Error('Failed to sign data');
  }
};

/**
 * Verifikasi tanda tangan digital menggunakan public key
 * @param {string} data - Data yang ditandatangani
 * @param {string} signature - Tanda tangan digital (base64)
 * @param {string} publicKey - Public key untuk verifikasi
 * @returns {boolean} Hasil verifikasi
 */
export const verifySignature = (data, signature, publicKey) => {
  try {
    const key = new NodeRSA(publicKey);
    return key.verify(Buffer.from(data), signature, 'utf8', 'base64');
  } catch (error) {
    logger.error(`Error verifying signature: ${error.message}`);
    return false;
  }
};

/**
 * Membuat token string acak
 * @param {number} length - Panjang token dalam byte
 * @returns {string} Token acak dalam format hex
 */
export const generateRandomToken = (length = 32) => {
  try {
    return crypto.randomBytes(length).toString('hex');
  } catch (error) {
    logger.error(`Error generating random token: ${error.message}`);
    throw new Error('Failed to generate random token');
  }
};

/**
 * Hash data menggunakan algoritma SHA-256
 * @param {string} data - Data yang akan di-hash
 * @returns {string} Hash SHA-256 dalam format hex
 */
export const hashData = (data) => {
  try {
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch (error) {
    logger.error(`Error hashing data: ${error.message}`);
    throw new Error('Failed to hash data');
  }
};