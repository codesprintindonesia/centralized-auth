 
/**
 * Layanan manajemen pengguna untuk aplikasi otentikasi terpusat
 */
import { 
    UserModel, 
    RoleModel, 
    TokenModel, 
    sequelize 
  } from '../models/index.model.js';
  import { 
    hashPassword, 
    verifyPassword 
  } from './crypto.service.js';
  import { logger } from '../utils/logger.util.js';
  
  /**
   * Mendapatkan pengguna berdasarkan ID
   * @param {string} userId - ID pengguna
   * @returns {Promise<Object>} Data pengguna dengan roles
   */
  export const getUserById = async (userId) => {
    try {
      const user = await UserModel.findWithRoles(userId);
      if (!user) {
        return { success: false, code: 'USER_NOT_FOUND', message: 'User not found' };
      }
  
      // Format response
      const roles = user.Roles ? user.Roles.map(role => role.name) : [];
  
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_active: user.is_active,
          is_locked: user.is_locked,
          last_login: user.last_login,
          created_at: user.created_at,
          roles: roles
        }
      };
    } catch (error) {
      logger.error(`Error in getUserById: ${error.message}`);
      return { 
        success: false, 
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred' 
      };
    }
  };
  
  /**
   * Mendapatkan daftar pengguna
   * @param {Object} options - Opsi paginasi dan filter
   * @returns {Promise<Object>} Daftar pengguna dengan pagination
   */
  export const listUsers = async (options = {}) => {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'username', 
      sortOrder = 'ASC',
      filter = {} 
    } = options;
    
    const offset = (page - 1) * limit;
    
    try {
      // Build where clause
      const where = {};
      
      if (filter.username) {
        where.username = { [sequelize.Op.iLike]: `%${filter.username}%` };
      }
      
      if (filter.email) {
        where.email = { [sequelize.Op.iLike]: `%${filter.email}%` };
      }
      
      if (filter.isActive !== undefined) {
        where.is_active = filter.isActive;
      }
      
      if (filter.isLocked !== undefined) {
        where.is_locked = filter.isLocked;
      }
      
      // Execute query
      const { count, rows } = await UserModel.findAndCountAll({
        where,
        include: [{
          model: RoleModel,
          as: 'Roles',
          through: { attributes: [] }
        }],
        order: [[sortBy, sortOrder]],
        limit,
        offset
      });
      
      // Format response
      const users = rows.map(user => {
        const roles = user.Roles ? user.Roles.map(role => role.name) : [];
        
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          is_active: user.is_active,
          is_locked: user.is_locked,
          last_login: user.last_login,
          created_at: user.created_at,
          roles: roles
        };
      });
      
      return {
        success: true,
        data: users,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error(`Error in listUsers: ${error.message}`);
      return { 
        success: false, 
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred' 
      };
    }
  };
  
  /**
   * Membuat pengguna baru
   * @param {Object} userData - Data pengguna baru
   * @param {string} createdBy - ID pengguna yang membuat
   * @returns {Promise<Object>} Pengguna yang dibuat
   */
  export const createUser = async (userData, createdBy) => {
    const { username, email, password, roles = [] } = userData;
    
    // Validasi input
    if (!username || !password) {
      return {
        success: false,
        code: 'INVALID_INPUT',
        message: 'Username and password are required'
      };
    }
    
    // Mulai transaksi database
    const transaction = await sequelize.transaction();
    
    try {
      // Cek apakah username sudah ada
      const existingUser = await UserModel.findOne({ 
        where: { username },
        transaction
      });
      
      if (existingUser) {
        await transaction.rollback();
        return {
          success: false,
          code: 'USERNAME_EXISTS',
          message: 'Username already exists'
        };
      }
      
      // Cek apakah email sudah ada (jika diberikan)
      if (email) {
        const existingEmail = await UserModel.findOne({ 
          where: { email },
          transaction
        });
        
        if (existingEmail) {
          await transaction.rollback();
          return {
            success: false,
            code: 'EMAIL_EXISTS',
            message: 'Email already exists'
          };
        }
      }
      
      // Hash password
      const { hash, salt } = await hashPassword(password);
      
      // Buat user baru
      const user = await UserModel.create({
        username,
        email,
        password_hash: hash,
        salt,
        is_active: true,
        created_by: createdBy,
        updated_by: createdBy
      }, { transaction });
      
      // Tambahkan roles jika ada
      if (roles.length > 0) {
        // Dapatkan role IDs berdasarkan nama
        const roleRecords = await RoleModel.findAll({
          where: {
            name: {
              [sequelize.Op.in]: roles
            }
          },
          transaction
        });
        
        // Tambahkan roles ke user
        await user.addRoles(roleRecords, { 
          through: { created_by: createdBy },
          transaction 
        });
      } else {
        // Jika tidak ada role yang diberikan, tambahkan role standard_user
        const standardRole = await RoleModel.findOne({
          where: { name: 'standard_user' },
          transaction
        });
        
        if (standardRole) {
          await user.addRole(standardRole, { 
            through: { created_by: createdBy },
            transaction 
          });
        }
      }
      
      // Commit transaksi
      await transaction.commit();
      
      // Ambil user dengan roles untuk response
      const createdUser = await UserModel.findWithRoles(user.id);
      const userRoles = createdUser.Roles ? createdUser.Roles.map(role => role.name) : [];
      
      logger.info(`User created: ${username} by ${createdBy}`);
      
      return {
        success: true,
        user: {
          id: createdUser.id,
          username: createdUser.username,
          email: createdUser.email,
          is_active: createdUser.is_active,
          created_at: createdUser.created_at,
          roles: userRoles
        }
      };
    } catch (error) {
      // Rollback transaksi jika terjadi error
      await transaction.rollback();
      
      logger.error(`Error in createUser: ${error.message}`);
      return { 
        success: false, 
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred' 
      };
    }
  };
  
  /**
   * Mengupdate data pengguna
   * @param {string} userId - ID pengguna
   * @param {Object} userData - Data pengguna yang diupdate
   * @param {string} updatedBy - ID pengguna yang mengupdate
   * @returns {Promise<Object>} Pengguna yang diupdate
   */
  export const updateUser = async (userId, userData, updatedBy) => {
    const { email, is_active, is_locked, roles } = userData;
    
    // Mulai transaksi database
    const transaction = await sequelize.transaction();
    
    try {
      // Dapatkan user yang akan diupdate
      const user = await UserModel.findByPk(userId, { transaction });
      
      if (!user) {
        await transaction.rollback();
        return {
          success: false,
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        };
      }
      
      // Persiapkan data yang akan diupdate
      const updateData = {
        updated_by: updatedBy
      };
      
      if (email !== undefined) {
        // Cek apakah email sudah digunakan pengguna lain
        if (email) {
          const existingEmail = await UserModel.findOne({ 
            where: { 
              email,
              id: { [sequelize.Op.ne]: userId }
            },
            transaction
          });
          
          if (existingEmail) {
            await transaction.rollback();
            return {
              success: false,
              code: 'EMAIL_EXISTS',
              message: 'Email already exists'
            };
          }
        }
        
        updateData.email = email;
      }
      
      if (is_active !== undefined) {
        updateData.is_active = is_active;
        
        // Jika user dinonaktifkan, revoke semua token mereka
        if (!is_active) {
          await TokenModel.revokeAllForUser(userId);
        }
      }
      
      if (is_locked !== undefined) {
        updateData.is_locked = is_locked;
        
        // Jika user dikunci, revoke semua token mereka
        if (is_locked) {
          await TokenModel.revokeAllForUser(userId);
        } else {
          // Jika user dibuka kuncinya, reset failed_attempts
          updateData.failed_attempts = 0;
        }
      }
      
      // Update user
      await user.update(updateData, { transaction });
      
      // Update roles jika diberikan
      if (roles !== undefined) {
        // Dapatkan role IDs berdasarkan nama
        const roleRecords = await RoleModel.findAll({
          where: {
            name: {
              [sequelize.Op.in]: roles
            }
          },
          transaction
        });
        
        // Set roles baru (menghapus yang lama)
        await user.setRoles(roleRecords, { 
          through: { created_by: updatedBy },
          transaction 
        });
      }
      
      // Commit transaksi
      await transaction.commit();
      
      // Ambil user dengan roles untuk response
      const updatedUser = await UserModel.findWithRoles(userId);
      const userRoles = updatedUser.Roles ? updatedUser.Roles.map(role => role.name) : [];
      
      logger.info(`User updated: ${user.username} by ${updatedBy}`);
      
      return {
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          is_active: updatedUser.is_active,
          is_locked: updatedUser.is_locked,
          last_login: updatedUser.last_login,
          updated_at: updatedUser.updated_at,
          roles: userRoles
        }
      };
    } catch (error) {
      // Rollback transaksi jika terjadi error
      await transaction.rollback();
      
      logger.error(`Error in updateUser: ${error.message}`);
      return { 
        success: false, 
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred' 
      };
    }
  };
  
  /**
   * Mengubah password pengguna
   * @param {string} userId - ID pengguna
   * @param {Object} passwordData - Data password
   * @param {string} updatedBy - ID pengguna yang mengubah
   * @returns {Promise<Object>} Hasil operasi
   */
  export const changePassword = async (userId, passwordData, updatedBy) => {
    const { currentPassword, newPassword } = passwordData;
    
    // Validasi input
    if (!currentPassword || !newPassword) {
      return {
        success: false,
        code: 'INVALID_INPUT',
        message: 'Current password and new password are required'
      };
    }
    
    try {
      // Dapatkan user
      const user = await UserModel.findByPk(userId);
      
      if (!user) {
        return {
          success: false,
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        };
      }
      
      // Verifikasi password saat ini
      const isPasswordValid = await verifyPassword(currentPassword, user.password_hash);
      
      if (!isPasswordValid) {
        return {
          success: false,
          code: 'INVALID_PASSWORD',
          message: 'Current password is invalid'
        };
      }
      
      // Hash password baru
      const { hash, salt } = await hashPassword(newPassword);
      
      // Update password
      await user.update({
        password_hash: hash,
        salt,
        password_changed_at: new Date(),
        updated_by: updatedBy
      });
      
      logger.info(`Password changed for user: ${user.username}`);
      
      return {
        success: true,
        message: 'Password successfully changed'
      };
    } catch (error) {
      logger.error(`Error in changePassword: ${error.message}`);
      return { 
        success: false, 
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred' 
      };
    }
  };
  
  /**
   * Reset password pengguna (oleh admin)
   * @param {string} userId - ID pengguna
   * @param {Object} passwordData - Data password baru
   * @param {string} adminId - ID admin yang mereset
   * @returns {Promise<Object>} Hasil operasi
   */
  export const resetPassword = async (userId, passwordData, adminId) => {
    const { newPassword } = passwordData;
    
    // Validasi input
    if (!newPassword) {
      return {
        success: false,
        code: 'INVALID_INPUT',
        message: 'New password is required'
      };
    }
    
    try {
      // Dapatkan user
      const user = await UserModel.findByPk(userId);
      
      if (!user) {
        return {
          success: false,
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        };
      }
      
      // Hash password baru
      const { hash, salt } = await hashPassword(newPassword);
      
      // Update password
      await user.update({
        password_hash: hash,
        salt,
        password_changed_at: new Date(),
        updated_by: adminId,
        // Reset failed_attempts jika akun terkunci
        failed_attempts: 0,
        is_locked: false
      });
      
      // Revoke semua token user
      await TokenModel.revokeAllForUser(userId);
      
      logger.info(`Password reset for user: ${user.username} by admin: ${adminId}`);
      
      return {
        success: true,
        message: 'Password successfully reset'
      };
    } catch (error) {
      logger.error(`Error in resetPassword: ${error.message}`);
      return { 
        success: false, 
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred' 
      };
    }
  };
  
  /**
   * Menghapus pengguna
   * @param {string} userId - ID pengguna
   * @returns {Promise<Object>} Hasil operasi
   */
  export const deleteUser = async (userId) => {
    try {
      const user = await UserModel.findByPk(userId);
      
      if (!user) {
        return {
          success: false,
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        };
      }
      
      // Hapus user
      await user.destroy();
      
      logger.info(`User deleted: ${user.username}`);
      
      return {
        success: true,
        message: 'User successfully deleted'
      };
    } catch (error) {
      logger.error(`Error in deleteUser: ${error.message}`);
      return { 
        success: false, 
        code: 'SYSTEM_ERROR',
        message: 'An internal system error occurred' 
      };
    }
  };