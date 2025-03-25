 
/**
 * Model Audit Log untuk aplikasi otentikasi terpusat
 */
import { DataTypes } from 'sequelize';

/**
 * Inisialisasi model AuditLog
 * @param {Sequelize} sequelize - Instance Sequelize
 * @returns {Model} Model AuditLog yang telah diinisialisasi
 */
export const initAuditLogModel = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'UUID audit log sebagai primary key'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Referensi ke table users (opsional untuk percobaan gagal)'
    },
    consumer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'api_consumers',
        key: 'id'
      },
      comment: 'Referensi ke table api_consumers'
    },
    event_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['login', 'logout', 'failed_login', 'token_generated', 'token_revoked', 
                'password_changed', 'account_locked', 'account_unlocked']]
      },
      comment: 'Jenis event (login, logout, failed_login, dll)'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['success', 'failure']]
      },
      comment: 'Status (success, failure)'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Detail tambahan (IP, user-agent, lokasi, dll)'
    },
    signature_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['valid', 'invalid', 'missing']]
      },
      comment: 'Status verifikasi tanda tangan (valid, invalid, missing)'
    }
  }, {
    tableName: 'auth_logs',
    schema: sequelize.options.searchPath[0], // menggunakan schema yang dikonfigurasi
    createdAt: 'created_at',
    updatedAt: false, // Tidak perlu updated_at untuk log
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['consumer_id']
      },
      {
        fields: ['event_type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  /**
   * Mencatat aktivitas login
   * @param {Object} data - Data log
   * @returns {Promise<Object>} Log yang dicatat
   */
  AuditLog.logLogin = async function(data) {
    return await this.create({
      user_id: data.userId,
      consumer_id: data.consumerId,
      event_type: 'login',
      status: data.success ? 'success' : 'failure',
      metadata: {
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        reason: data.reason,
        location: data.location,
        ...data.additionalMetadata
      },
      signature_status: data.signatureStatus || 'missing'
    });
  };

  /**
   * Mencatat aktivitas logout
   * @param {Object} data - Data log
   * @returns {Promise<Object>} Log yang dicatat
   */
  AuditLog.logLogout = async function(data) {
    return await this.create({
      user_id: data.userId,
      consumer_id: data.consumerId,
      event_type: 'logout',
      status: 'success',
      metadata: {
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        token_id: data.tokenId,
        ...data.additionalMetadata
      },
      signature_status: data.signatureStatus || 'missing'
    });
  };

  /**
   * Mencatat aktivitas token
   * @param {Object} data - Data log
   * @returns {Promise<Object>} Log yang dicatat
   */
  AuditLog.logToken = async function(data) {
    return await this.create({
      user_id: data.userId,
      consumer_id: data.consumerId,
      event_type: data.action === 'generate' ? 'token_generated' : 'token_revoked',
      status: data.success ? 'success' : 'failure',
      metadata: {
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        token_id: data.tokenId,
        reason: data.reason,
        ...data.additionalMetadata
      },
      signature_status: data.signatureStatus || 'missing'
    });
  };

  /**
   * Mencatat perubahan password
   * @param {Object} data - Data log
   * @returns {Promise<Object>} Log yang dicatat
   */
  AuditLog.logPasswordChange = async function(data) {
    return await this.create({
      user_id: data.userId,
      consumer_id: data.consumerId,
      event_type: 'password_changed',
      status: data.success ? 'success' : 'failure',
      metadata: {
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        initiated_by: data.initiatedBy || data.userId, // Diri sendiri atau admin
        reason: data.reason,
        ...data.additionalMetadata
      },
      signature_status: data.signatureStatus || 'missing'
    });
  };

  /**
   * Mendapatkan aktivitas login untuk user tertentu
   * @param {string} userId - ID user
   * @param {number} limit - Batas jumlah data
   * @param {number} offset - Offset data
   * @returns {Promise<Array>} Daftar aktivitas login
   */
  AuditLog.getLoginHistoryForUser = async function(userId, limit = 10, offset = 0) {
    return await this.findAll({
      where: {
        user_id: userId,
        event_type: 'login'
      },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  };

  /**
   * Mendapatkan aktivitas gagal untuk analisis keamanan
   * @param {Object} options - Opsi filter
   * @returns {Promise<Array>} Daftar aktivitas gagal
   */
  AuditLog.getFailedActivities = async function(options = {}) {
    const { startDate, endDate, limit = 100, offset = 0 } = options;
    
    const whereClause = {
      status: 'failure'
    };
    
    if (startDate || endDate) {
      whereClause.created_at = {};
      
      if (startDate) {
        whereClause.created_at[sequelize.Op.gte] = startDate;
      }
      
      if (endDate) {
        whereClause.created_at[sequelize.Op.lte] = endDate;
      }
    }
    
    return await this.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: sequelize.models.User,
          as: 'User',
          attributes: ['id', 'username', 'email']
        },
        {
          model: sequelize.models.Consumer,
          as: 'Consumer',
          attributes: ['id', 'name']
        }
      ]
    });
  };

  return AuditLog;
};