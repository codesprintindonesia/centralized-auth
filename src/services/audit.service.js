 
/**
 * Layanan audit log untuk aplikasi otentikasi terpusat
 */
import { 
    AuditLogModel, 
    UserModel, 
    ConsumerModel,
    sequelize 
  } from '../models/index.model.js';
  import { logger } from '../utils/logger.util.js';
  
  /**
   * Log aktivitas login
   * @param {Object} data - Data log
   * @returns {Promise<Object>} Log yang dicatat
   */
  export const logLoginActivity = async (data) => {
    try {
      const {
        userId,
        username,
        consumerId,
        consumerName,
        success,
        ipAddress,
        userAgent,
        reason,
        location,
        signatureStatus,
        additionalData = {}
      } = data;
  
      const logData = {
        user_id: userId,
        consumer_id: consumerId,
        event_type: 'login',
        status: success ? 'success' : 'failure',
        metadata: {
          username: username || null, // Capture username even for failed attempts
          ip_address: ipAddress,
          user_agent: userAgent,
          reason: reason || null,
          location: location || null,
          consumer_name: consumerName || null,
          ...additionalData
        },
        signature_status: signatureStatus || 'missing'
      };
  
      const auditLog = await AuditLogModel.create(logData);
  
      return {
        success: true,
        logId: auditLog.id
      };
    } catch (error) {
      logger.error(`Error logging login activity: ${error.message}`);
      // Still return success since logging failure shouldn't break the flow
      return {
        success: false,
        error: error.message
      };
    }
  };
  
  /**
   * Log aktivitas logout
   * @param {Object} data - Data log
   * @returns {Promise<Object>} Log yang dicatat
   */
  export const logLogoutActivity = async (data) => {
    try {
      const {
        userId,
        consumerId,
        tokenId,
        ipAddress,
        userAgent,
        signatureStatus,
        additionalData = {}
      } = data;
  
      const logData = {
        user_id: userId,
        consumer_id: consumerId,
        event_type: 'logout',
        status: 'success',
        metadata: {
          ip_address: ipAddress,
          user_agent: userAgent,
          token_id: tokenId,
          ...additionalData
        },
        signature_status: signatureStatus || 'missing'
      };
  
      const auditLog = await AuditLogModel.create(logData);
  
      return {
        success: true,
        logId: auditLog.id
      };
    } catch (error) {
      logger.error(`Error logging logout activity: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  };
  
  /**
   * Log aktivitas token
   * @param {Object} data - Data log
   * @returns {Promise<Object>} Log yang dicatat
   */
  export const logTokenActivity = async (data) => {
    try {
      const {
        userId,
        consumerId,
        tokenId,
        action, // 'generate' atau 'revoke'
        success,
        ipAddress,
        userAgent,
        reason,
        signatureStatus,
        additionalData = {}
      } = data;
  
      const logData = {
        user_id: userId,
        consumer_id: consumerId,
        event_type: action === 'generate' ? 'token_generated' : 'token_revoked',
        status: success ? 'success' : 'failure',
        metadata: {
          ip_address: ipAddress,
          user_agent: userAgent,
          token_id: tokenId,
          reason: reason || null,
          ...additionalData
        },
        signature_status: signatureStatus || 'missing'
      };
  
      const auditLog = await AuditLogModel.create(logData);
  
      return {
        success: true,
        logId: auditLog.id
      };
    } catch (error) {
      logger.error(`Error logging token activity: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  };
  
  /**
   * Log aktivitas perubahan password
   * @param {Object} data - Data log
   * @returns {Promise<Object>} Log yang dicatat
   */
  export const logPasswordActivity = async (data) => {
    try {
      const {
        userId,
        consumerId,
        initiatedBy,
        isReset,
        success,
        ipAddress,
        userAgent,
        reason,
        signatureStatus,
        additionalData = {}
      } = data;
  
      const logData = {
        user_id: userId,
        consumer_id: consumerId,
        event_type: 'password_changed',
        status: success ? 'success' : 'failure',
        metadata: {
          ip_address: ipAddress,
          user_agent: userAgent,
          initiated_by: initiatedBy || userId,
          is_reset: isReset || false,
          reason: reason || null,
          ...additionalData
        },
        signature_status: signatureStatus || 'missing'
      };
  
      const auditLog = await AuditLogModel.create(logData);
  
      return {
        success: true,
        logId: auditLog.id
      };
    } catch (error) {
      logger.error(`Error logging password activity: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  };
  
  /**
   * Log aktivitas account locking/unlocking
   * @param {Object} data - Data log
   * @returns {Promise<Object>} Log yang dicatat
   */
  export const logAccountActivity = async (data) => {
    try {
      const {
        userId,
        consumerId,
        action, // 'lock' or 'unlock'
        initiatedBy,
        reason,
        ipAddress,
        userAgent,
        signatureStatus,
        additionalData = {}
      } = data;
  
      const logData = {
        user_id: userId,
        consumer_id: consumerId,
        event_type: action === 'lock' ? 'account_locked' : 'account_unlocked',
        status: 'success',
        metadata: {
          ip_address: ipAddress,
          user_agent: userAgent,
          initiated_by: initiatedBy || null,
          reason: reason || null,
          ...additionalData
        },
        signature_status: signatureStatus || 'missing'
      };
  
      const auditLog = await AuditLogModel.create(logData);
  
      return {
        success: true,
        logId: auditLog.id
      };
    } catch (error) {
      logger.error(`Error logging account activity: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  };
  
  /**
   * Mendapatkan riwayat login pengguna
   * @param {string} userId - ID pengguna
   * @param {Object} options - Opsi paginasi
   * @returns {Promise<Object>} Riwayat login
   */
  export const getUserLoginHistory = async (userId, options = {}) => {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    
    try {
      const logs = await AuditLogModel.findAndCountAll({
        where: {
          user_id: userId,
          event_type: 'login'
        },
        order: [['created_at', 'DESC']],
        limit,
        offset,
        include: [
          {
            model: ConsumerModel,
            as: 'Consumer',
            attributes: ['id', 'name']
          }
        ]
      });
  
      // Format response
      const loginHistory = logs.rows.map(log => ({
        id: log.id,
        timestamp: log.created_at,
        status: log.status,
        consumer: log.Consumer ? {
          id: log.Consumer.id,
          name: log.Consumer.name
        } : null,
        ipAddress: log.metadata.ip_address,
        userAgent: log.metadata.user_agent,
        location: log.metadata.location
      }));
  
      return {
        success: true,
        data: loginHistory,
        pagination: {
          total: logs.count,
          page,
          limit,
          totalPages: Math.ceil(logs.count / limit)
        }
      };
    } catch (error) {
      logger.error(`Error retrieving login history: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Mendapatkan aktivitas keamanan
   * @param {Object} filters - Filter pencarian
   * @param {Object} options - Opsi paginasi
   * @returns {Promise<Object>} Aktivitas keamanan
   */
  export const getSecurityActivity = async (filters = {}, options = {}) => {
    const { 
      userId, 
      consumerId, 
      eventType, 
      status, 
      startDate, 
      endDate 
    } = filters;
    
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    try {
      // Build where clause
      const where = {};
      
      if (userId) {
        where.user_id = userId;
      }
      
      if (consumerId) {
        where.consumer_id = consumerId;
      }
      
      if (eventType) {
        where.event_type = eventType;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (startDate || endDate) {
        where.created_at = {};
        
        if (startDate) {
          where.created_at[sequelize.Op.gte] = new Date(startDate);
        }
        
        if (endDate) {
          where.created_at[sequelize.Op.lte] = new Date(endDate);
        }
      }
      
      // Execute query
      const logs = await AuditLogModel.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        include: [
          {
            model: UserModel,
            as: 'User',
            attributes: ['id', 'username', 'email']
          },
          {
            model: ConsumerModel,
            as: 'Consumer',
            attributes: ['id', 'name']
          }
        ]
      });
  
      // Format response
      const activities = logs.rows.map(log => ({
        id: log.id,
        timestamp: log.created_at,
        eventType: log.event_type,
        status: log.status,
        user: log.User ? {
          id: log.User.id,
          username: log.User.username,
          email: log.User.email
        } : null,
        consumer: log.Consumer ? {
          id: log.Consumer.id,
          name: log.Consumer.name
        } : null,
        metadata: log.metadata,
        signatureStatus: log.signature_status
      }));
  
      return {
        success: true,
        data: activities,
        pagination: {
          total: logs.count,
          page,
          limit,
          totalPages: Math.ceil(logs.count / limit)
        }
      };
    } catch (error) {
      logger.error(`Error retrieving security activity: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };
  
  /**
   * Mendapatkan statistik aktivitas keamanan
   * @param {Object} filters - Filter untuk statistik
   * @returns {Promise<Object>} Statistik aktivitas
   */
  export const getSecurityStats = async (filters = {}) => {
    const { startDate, endDate } = filters;
    
    try {
      // Prepare date filters
      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.created_at = {};
        
        if (startDate) {
          dateFilter.created_at[sequelize.Op.gte] = new Date(startDate);
        }
        
        if (endDate) {
          dateFilter.created_at[sequelize.Op.lte] = new Date(endDate);
        }
      }
      
      // Get login success vs. failure stats
      const loginStats = await AuditLogModel.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          event_type: 'login',
          ...dateFilter
        },
        group: ['status']
      });
      
      // Format login stats
      const loginSuccessCount = loginStats.find(stat => stat.status === 'success')?.get('count') || 0;
      const loginFailureCount = loginStats.find(stat => stat.status === 'failure')?.get('count') || 0;
      
      // Get stats by event type
      const eventStats = await AuditLogModel.findAll({
        attributes: [
          'event_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: dateFilter,
        group: ['event_type']
      });
      
      // Format event stats
      const eventsByType = {};
      eventStats.forEach(stat => {
        eventsByType[stat.event_type] = parseInt(stat.get('count'));
      });
      
      // Get top consumers
      const topConsumers = await AuditLogModel.findAll({
        attributes: [
          'consumer_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: dateFilter,
        group: ['consumer_id'],
        order: [[sequelize.literal('count'), 'DESC']],
        limit: 5,
        include: [
          {
            model: ConsumerModel,
            as: 'Consumer',
            attributes: ['name']
          }
        ]
      });
      
      // Format top consumers
      const formattedTopConsumers = topConsumers.map(stat => ({
        id: stat.consumer_id,
        name: stat.Consumer?.name || 'Unknown',
        count: parseInt(stat.get('count'))
      }));
      
      return {
        success: true,
        data: {
          loginStats: {
            success: parseInt(loginSuccessCount),
            failure: parseInt(loginFailureCount),
            total: parseInt(loginSuccessCount) + parseInt(loginFailureCount),
            failureRate: parseInt(loginFailureCount) > 0 
              ? (parseInt(loginFailureCount) / (parseInt(loginSuccessCount) + parseInt(loginFailureCount)) * 100).toFixed(2) 
              : 0
          },
          eventStats: eventsByType,
          topConsumers: formattedTopConsumers
        }
      };
    } catch (error) {
      logger.error(`Error retrieving security stats: ${error.message}`);
      return {
        success: false,
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred'
      };
    }
  };