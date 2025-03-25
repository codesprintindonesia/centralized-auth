 
/**
 * Model API Consumer untuk aplikasi otentikasi terpusat
 */
import { DataTypes } from 'sequelize';

/**
 * Inisialisasi model Consumer
 * @param {Sequelize} sequelize - Instance Sequelize
 * @returns {Model} Model Consumer yang telah diinisialisasi
 */
export const initConsumerModel = (sequelize) => {
  const Consumer = sequelize.define('Consumer', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'UUID consumer sebagai primary key'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Nama aplikasi consumer'
    },
    api_key_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Hash dari API key'
    },
    api_key_salt: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Salt untuk API key'
    },
    public_key: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Kunci publik consumer untuk verifikasi tanda tangan'
    },
    key_algorithm: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'RSA-2048',
      comment: 'Algoritma kunci yang digunakan (RSA, ECDSA, Ed25519)'
    },
    key_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Versi kunci untuk rotasi kunci'
    },
    allowed_ips: {
      type: DataTypes.ARRAY(DataTypes.INET),
      defaultValue: [],
      comment: 'IP address yang diizinkan (opsional)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Status aktif API consumer'
    }
  }, {
    tableName: 'api_consumers',
    schema: sequelize.options.searchPath[0], // menggunakan schema yang dikonfigurasi
    timestamps: true, // enables createdAt and updatedAt
    underscored: true, // use snake_case for fields
  });

  /**
   * Mendapatkan consumer berdasarkan nama
   * @param {string} name - Nama consumer yang dicari
   * @returns {Promise<Object>} Consumer yang ditemukan
   */
  Consumer.findByName = async function(name) {
    return await this.findOne({
      where: { name, is_active: true }
    });
  };

  /**
   * Mendapatkan consumer berdasarkan api_key_hash
   * @param {string} apiKeyHash - Hash API key yang dicari
   * @returns {Promise<Object>} Consumer yang ditemukan
   */
  Consumer.findByApiKeyHash = async function(apiKeyHash) {
    return await this.findOne({
      where: { api_key_hash: apiKeyHash, is_active: true }
    });
  };

  /**
   * Memeriksa apakah IP diizinkan untuk consumer tertentu
   * @param {string} consumerId - ID consumer
   * @param {string} ipAddress - Alamat IP yang diperiksa
   * @returns {Promise<boolean>} Hasil pemeriksaan
   */
  Consumer.isIpAllowed = async function(consumerId, ipAddress) {
    const consumer = await this.findByPk(consumerId);
    
    if (!consumer || !consumer.is_active) {
      return false;
    }
    
    // Jika allowed_ips kosong, semua IP diizinkan
    if (!consumer.allowed_ips || consumer.allowed_ips.length === 0) {
      return true;
    }
    
    // Periksa apakah IP ada dalam daftar yang diizinkan
    // (implementasi detail perlu menyesuaikan dengan cara PostgreSQL menyimpan INET)
    // Ini adalah contoh implementasi sederhana
    return consumer.allowed_ips.some(allowedIp => {
      // Implementasi sederhana untuk pencocokan IP
      // Untuk implementasi yang lebih baik, gunakan library CIDR matching
      return ipAddress === allowedIp || allowedIp.includes('/0');
    });
  };

  /**
   * Memperbarui kunci publik consumer
   * @param {string} consumerId - ID consumer
   * @param {string} publicKey - Kunci publik baru
   * @param {string} keyAlgorithm - Algoritma kunci
   * @returns {Promise<Object>} Consumer yang diperbarui
   */
  Consumer.updatePublicKey = async function(consumerId, publicKey, keyAlgorithm) {
    const consumer = await this.findByPk(consumerId);
    
    if (!consumer) {
      throw new Error('Consumer not found');
    }
    
    // Increment key version
    const newVersion = consumer.key_version + 1;
    
    // Update public key
    await consumer.update({
      public_key: publicKey,
      key_algorithm: keyAlgorithm,
      key_version: newVersion
    });
    
    return consumer;
  };

  return Consumer;
};