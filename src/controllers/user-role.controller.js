/**
 * Controller untuk manajemen user-role (penugasan peran ke pengguna)
 */
import { 
    UserModel, 
    RoleModel,
    sequelize 
  } from '../models/index.model.js';
  import { successResponse, errorResponse, serviceErrorResponse, ResponseCode } from '../utils/response.util.js';
  import { logger } from '../utils/logger.util.js';
  
  /**
   * Mendapatkan peran pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const getUserRoles = async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Cek apakah pengguna ada
      const user = await UserModel.findByPk(userId);
      if (!user) {
        return errorResponse(
          res,
          ResponseCode.NOT_FOUND,
          'Pengguna tidak ditemukan'
        );
      }
      
      // Dapatkan user dengan roles
      const userWithRoles = await UserModel.findWithRoles(userId);
      
      // Format response
      const roles = userWithRoles.Roles ? userWithRoles.Roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        priority: role.priority
      })) : [];
      
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Daftar peran pengguna berhasil diambil',
        {
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          },
          roles: roles
        }
      );
    } catch (error) {
      logger.error(`Get user roles error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mengambil peran pengguna'
      );
    }
  };
  
  /**
   * Menetapkan peran ke pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const assignRolesToUser = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { userId } = req.params;
      const { roles } = req.body;
      
      // Cek apakah pengguna ada
      const user = await UserModel.findByPk(userId, { transaction });
      if (!user) {
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.NOT_FOUND,
          'Pengguna tidak ditemukan'
        );
      }
      
      // Dapatkan semua role berdasarkan nama
      const roleRecords = await RoleModel.findAll({
        where: {
          name: roles
        },
        transaction
      });
      
      // Jika ada role yang tidak ditemukan
      if (roleRecords.length !== roles.length) {
        const foundRoleNames = roleRecords.map(role => role.name);
        const notFoundRoles = roles.filter(role => !foundRoleNames.includes(role));
        
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.NOT_FOUND,
          `Beberapa peran tidak ditemukan: ${notFoundRoles.join(', ')}`
        );
      }
      
      // Set roles untuk user (ini akan menghapus semua role yang ada dan menggantinya)
      await user.setRoles(roleRecords, { 
        through: { created_by: req.user.id },
        transaction 
      });
      
      await transaction.commit();
      
      logger.info(`Roles assigned to user ${user.username}: ${roles.join(', ')}`);
      
      // Dapatkan user dengan roles untuk response
      const userWithRoles = await UserModel.findWithRoles(userId);
      const updatedRoles = userWithRoles.Roles ? userWithRoles.Roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        priority: role.priority
      })) : [];
      
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Peran berhasil ditetapkan ke pengguna',
        {
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          },
          roles: updatedRoles
        }
      );
    } catch (error) {
      await transaction.rollback();
      logger.error(`Assign roles to user error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat menetapkan peran ke pengguna'
      );
    }
  };
  
  /**
   * Menghapus peran dari pengguna
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const removeRoleFromUser = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { userId, roleId } = req.params;
      
      // Cek apakah pengguna ada
      const user = await UserModel.findByPk(userId, { transaction });
      if (!user) {
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.NOT_FOUND,
          'Pengguna tidak ditemukan'
        );
      }
      
      // Cek apakah peran ada
      const role = await RoleModel.findByPk(roleId, { transaction });
      if (!role) {
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.NOT_FOUND,
          'Peran tidak ditemukan'
        );
      }
      
      // Hapus relasi antara user dan role
      await user.removeRole(role, { transaction });
      
      await transaction.commit();
      
      logger.info(`Role ${role.name} removed from user ${user.username}`);
      
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        `Peran ${role.name} berhasil dihapus dari pengguna ${user.username}`,
        null
      );
    } catch (error) {
      await transaction.rollback();
      logger.error(`Remove role from user error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat menghapus peran dari pengguna'
      );
    }
  };