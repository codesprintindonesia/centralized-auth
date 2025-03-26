/**
 * Controller untuk manajemen peran
 */
import { 
    RoleModel, 
    PermissionModel,
    sequelize 
  } from '../models/index.model.js';
  import { successResponse, errorResponse, serviceErrorResponse, ResponseCode } from '../utils/response.util.js';
  import { logger } from '../utils/logger.util.js';
  
  /**
   * Mendapatkan daftar peran
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const getRoles = async (req, res) => {
    try {
      // Dapatkan semua peran dengan jumlah pengguna
      const roles = await RoleModel.findAllWithUserCount();
      
      // Format response
      const formattedRoles = roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        priority: role.priority,
        userCount: role.get('userCount') || 0,
        created_at: role.created_at,
        updated_at: role.updated_at
      }));
      
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Daftar peran berhasil diambil',
        formattedRoles
      );
    } catch (error) {
      logger.error(`Get roles error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mengambil daftar peran'
      );
    }
  };
  
  /**
   * Mendapatkan detail peran termasuk izin-izinnya
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const getRoleDetail = async (req, res) => {
    try {
      const { roleId } = req.params;
      
      // Dapatkan peran dengan izin-izinnya
      const role = await RoleModel.findWithPermissions(roleId);
      
      if (!role) {
        return errorResponse(
          res,
          ResponseCode.NOT_FOUND,
          'Peran tidak ditemukan'
        );
      }
      
      // Format response
      const permissions = role.Permissions ? role.Permissions.map(permission => ({
        id: permission.id,
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action
      })) : [];
      
      const roleData = {
        id: role.id,
        name: role.name,
        description: role.description,
        priority: role.priority,
        permissions: permissions,
        created_at: role.created_at,
        updated_at: role.updated_at
      };
      
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Detail peran berhasil diambil',
        roleData
      );
    } catch (error) {
      logger.error(`Get role detail error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mengambil detail peran'
      );
    }
  };
  
  /**
   * Membuat peran baru
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const createRole = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { name, description, priority, permissions } = req.body;
      
      // Cek apakah nama peran sudah ada
      const existingRole = await RoleModel.findOne({
        where: { name },
        transaction
      });
      
      if (existingRole) {
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.CONFLICT,
          'Nama peran sudah digunakan'
        );
      }
      
      // Buat peran baru
      const role = await RoleModel.create({
        name,
        description,
        priority: priority || 0
      }, { transaction });
      
      // Tambahkan izin jika ada
      if (permissions && permissions.length > 0) {
        // Dapatkan izin berdasarkan nama
        const permissionRecords = await PermissionModel.findAll({
          where: {
            name: permissions
          },
          transaction
        });
        
        // Tambahkan izin ke peran
        if (permissionRecords.length > 0) {
          await role.addPermissions(permissionRecords, { transaction });
        }
      }
      
      await transaction.commit();
      
      logger.info(`Role created: ${name}`);
      
      return successResponse(
        res,
        ResponseCode.CREATED,
        'Peran berhasil dibuat',
        {
          id: role.id,
          name: role.name,
          description: role.description,
          priority: role.priority,
          created_at: role.created_at
        }
      );
    } catch (error) {
      await transaction.rollback();
      logger.error(`Create role error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat membuat peran baru'
      );
    }
  };
  
  /**
   * Mengupdate peran
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const updateRole = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { roleId } = req.params;
      const { description, priority, permissions } = req.body;
      
      // Dapatkan peran yang akan diupdate
      const role = await RoleModel.findByPk(roleId, { transaction });
      
      if (!role) {
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.NOT_FOUND,
          'Peran tidak ditemukan'
        );
      }
      
      // Update data peran
      const updateData = {};
      
      if (description !== undefined) {
        updateData.description = description;
      }
      
      if (priority !== undefined) {
        updateData.priority = priority;
      }
      
      // Update peran jika ada data yang diubah
      if (Object.keys(updateData).length > 0) {
        await role.update(updateData, { transaction });
      }
      
      // Update izin jika ada
      if (permissions !== undefined) {
        // Dapatkan izin berdasarkan nama
        const permissionRecords = await PermissionModel.findAll({
          where: {
            name: permissions
          },
          transaction
        });
        
        // Set izin baru (menghapus yang lama)
        await role.setPermissions(permissionRecords, { transaction });
      }
      
      await transaction.commit();
      
      logger.info(`Role updated: ${role.name}`);
      
      // Dapatkan peran dengan izin-izinnya untuk response
      const updatedRole = await RoleModel.findWithPermissions(roleId);
      const rolePermissions = updatedRole.Permissions ? updatedRole.Permissions.map(permission => ({
        id: permission.id,
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action
      })) : [];
      
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Peran berhasil diperbarui',
        {
          id: updatedRole.id,
          name: updatedRole.name,
          description: updatedRole.description,
          priority: updatedRole.priority,
          permissions: rolePermissions,
          updated_at: updatedRole.updated_at
        }
      );
    } catch (error) {
      await transaction.rollback();
      logger.error(`Update role error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat memperbarui peran'
      );
    }
  };
  
  /**
   * Menghapus peran
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const deleteRole = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { roleId } = req.params;
      
      // Dapatkan peran yang akan dihapus
      const role = await RoleModel.findByPk(roleId, { transaction });
      
      if (!role) {
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.NOT_FOUND,
          'Peran tidak ditemukan'
        );
      }
      
      // Hapus relasi dengan izin dan pengguna
      await role.setPermissions([], { transaction });
      await role.setUsers([], { transaction });
      
      // Hapus peran
      await role.destroy({ transaction });
      
      await transaction.commit();
      
      logger.info(`Role deleted: ${role.name}`);
      
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Peran berhasil dihapus',
        null
      );
    } catch (error) {
      await transaction.rollback();
      logger.error(`Delete role error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat menghapus peran'
      );
    }
  };