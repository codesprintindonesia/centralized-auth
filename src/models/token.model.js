 
/**
 * Model Token untuk aplikasi otentikasi terpusat
 */
import { DataTypes } from 'sequelize';

/**
 * Inisialisasi model Token
 * @param {Sequelize} sequelize - Instance Sequelize
 * @returns {Model} Model Token yang telah diinisialisasi
 */
export const initTokenModel = (sequelize) => {
  const Token = sequelize.define('Token', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'UUID token sebagai primary key'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Referensi ke table users'
    },
    consumer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'api_consumers',
        key: 'id'
      },
      comment: 'Referensi ke table api_consumers'
    },
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Hash dari token yang dikeluarkan'
    },
    signature: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Tanda tangan digital token menggunakan kunci privat provider'
    },
    provider_key_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'provider_keys',
        key: 'id'
      },
      comment: 'Kunci yang digunakan untuk menandatangani'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Waktu kedaluwarsa token'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Metadata token (device, IP, dll)'
    },
    is_revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Status token dicabut'
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Waktu pencabutan token (jika ada)'
    }
  }, {
    tableName: 'access_tokens',
    schema: sequelize.options.searchPath[0], // menggunakan schema yang dikonfigurasi
    timestamps: true, // enables createdAt and updatedAt
    underscored: true, // use snake_case for fields
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['consumer_id']
      },
      {
        fields: ['token_hash']
      },
      {
        fields: ['expires_at']
      }
    ]
  });

  /**
   * Mencari token berdasarkan hash token
   * @param {string} tokenHash - Hash token
   * @returns {Promise<Object>} Token yang ditemukan
   */
  Token.findByTokenHash = async function(tokenHash) {
    return await this.findOne({
      where: { 
        token_hash: tokenHash,
        is_revoked: false,
        expires_at: { [sequelize.Op.gt]: new Date() }
      }
    });
  };

  /**
   * Mendapatkan semua token aktif untuk user tertentu
   * @param {string} userId - ID user
   * @returns {Promise<Array>} Daftar token aktif
   */
  Token.findActiveTokensByUser = async function(userId) {
    return await this.findAll({
      where: {
        user_id: userId,
        is_revoked: false,
        expires_at: { [sequelize.Op.gt]: new Date() }
      },
      include: [{
        model: sequelize.models.Consumer,
        as: 'Consumer',
        attributes: ['id', 'name']
      }],
      order: [['created_at', 'DESC']]
    });
  };

  /**
   * Mencabut semua token untuk user tertentu
   * @param {string} userId - ID user
   * @returns {Promise<number>} Jumlah token yang dicabut
   */
  Token.revokeAllForUser = async function(userId) {
    const now = new Date();
    
    const result = await this.update(
      {
        is_revoked: true,
        revoked_at: now
      },
      {
        where: {
          user_id: userId,
          is_revoked: false,
          expires_at: { [sequelize.Op.gt]: now }
        }
      }
    );
    
    return result[0]; // Jumlah baris yang diperbarui
  };

  /**
   * Mencabut token berdasarkan ID
   * @param {string} tokenId - ID token
   * @returns {Promise<boolean>} Hasil operasi
   */
  Token.revokeById = async function(tokenId) {
    const token = await this.findByPk(tokenId);
    
    if (!token) {
      throw new Error('Token not found');
    }
    
    if (token.is_revoked) {
      return false; // Token sudah dicabut
    }
    
    await token.update({
      is_revoked: true,
      revoked_at: new Date()
    });
    
    return true;
  };

  /**
   * Mencabut token berdasarkan consumer dan user
   * @param {string} consumerId - ID consumer
   * @param {string} userId - ID user
   * @returns {Promise<number>} Jumlah token yang dicabut
   */
  Token.revokeByConsumerAndUser = async function(consumerId, userId) {
    const now = new Date();
    
    const result = await this.update(
      {
        is_revoked: true,
        revoked_at: now
      },
      {
        where: {
          consumer_id: consumerId,
          user_id: userId,
          is_revoked: false,
          expires_at: { [sequelize.Op.gt]: now }
        }
      }
    );
    
    return result[0]; // Jumlah baris yang diperbarui
  };

  /**
   * Menghapus token kedaluwarsa
   * @param {number} olderThanDays - Hari kedaluwarsa (default: 30)
   * @returns {Promise<number>} Jumlah token yang dihapus
   */
  Token.cleanupExpired = async function(olderThanDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await this.destroy({
      where: {
        [sequelize.Op.or]: [
          { expires_at: { [sequelize.Op.lt]: cutoffDate } },
          { 
            is_revoked: true,
            revoked_at: { [sequelize.Op.lt]: cutoffDate }
          }
        ]
      }
    });
    
    return result; // Jumlah baris yang dihapus
  };

  return Token;
};