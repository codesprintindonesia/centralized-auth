/**
 * Controller untuk manajemen izin (permission)
 */
import { 
    PermissionModel, 
    sequelize 
  } from '../models/index.model.js';
  import { successResponse, errorResponse, serviceErrorResponse, ResponseCode } from '../utils/response.util.js';
  import { logger } from '../utils/logger.util.js';
  
  /**
   * Mendapatkan daftar izin
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const getPermissions = async (req, res) => {
    try {
      const { resource } = req.query;
      
      let permissions;
      
      // Jika ada filter resource, filter berdasarkan resource
      if (resource) {
        permissions = await PermissionModel.findAll({
          where: { resource },
          order: [['action', 'ASC']]
        });
        
        // Format response
        const formattedPermissions = permissions.map(permission => ({
          id: permission.id,
          name: permission.name,
          description: permission.description,
          resource: permission.resource,
          action: permission.action,
          created_at: permission.created_at,
          updated_at: permission.updated_at
        }));
        
        return successResponse(
          res,
          ResponseCode.SUCCESS,
          `Daftar izin untuk resource ${resource} berhasil diambil`,
          formattedPermissions
        );
      } 
      
      // Jika tidak ada filter, ambil semua izin dikelompokkan berdasarkan resource
      else {
        const groupedPermissions = await PermissionModel.findAllGroupedByResource();
        
        return successResponse(
          res,
          ResponseCode.SUCCESS,
          'Daftar izin berhasil diambil',
          groupedPermissions
        );
      }
    } catch (error) {
      logger.error(`Get permissions error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat mengambil daftar izin'
      );
    }
  };
  
  /**
   * Membuat izin baru
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const createPermission = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { name, description, resource, action } = req.body;
      
      // Cek apakah nama izin sudah ada
      const existingPermission = await PermissionModel.findOne({
        where: { name },
        transaction
      });
      
      if (existingPermission) {
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.CONFLICT,
          'Nama izin sudah digunakan'
        );
      }
      
      // Cek apakah kombinasi resource dan action sudah ada
      const existingResourceAction = await PermissionModel.findOne({
        where: { resource, action },
        transaction
      });
      
      if (existingResourceAction) {
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.CONFLICT,
          `Kombinasi resource "${resource}" dan action "${action}" sudah ada`
        );
      }
      
      // Buat izin baru
      const permission = await PermissionModel.create({
        name,
        description,
        resource,
        action
      }, { transaction });
      
      await transaction.commit();
      
      logger.info(`Permission created: ${name}`);
      
      return successResponse(
        res,
        ResponseCode.CREATED,
        'Izin berhasil dibuat',
        {
          id: permission.id,
          name: permission.name,
          description: permission.description,
          resource: permission.resource,
          action: permission.action,
          created_at: permission.created_at
        }
      );
    } catch (error) {
      await transaction.rollback();
      logger.error(`Create permission error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat membuat izin baru'
      );
    }
  };
  
  /**
   * Mengupdate izin
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const updatePermission = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { permissionId } = req.params;
      const { description } = req.body;
      
      // Dapatkan izin yang akan diupdate
      const permission = await PermissionModel.findByPk(permissionId, { transaction });
      
      if (!permission) {
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.NOT_FOUND,
          'Izin tidak ditemukan'
        );
      }
      
      // Update data izin
      await permission.update({
        description
      }, { transaction });
      
      await transaction.commit();
      
      logger.info(`Permission updated: ${permission.name}`);
      
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Izin berhasil diperbarui',
        {
          id: permission.id,
          name: permission.name,
          description: permission.description,
          resource: permission.resource,
          action: permission.action,
          updated_at: permission.updated_at
        }
      );
    } catch (error) {
      await transaction.rollback();
      logger.error(`Update permission error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat memperbarui izin'
      );
    }
  };
  
  /**
   * Menghapus izin
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const deletePermission = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { permissionId } = req.params;
      
      // Dapatkan izin yang akan dihapus
      const permission = await PermissionModel.findByPk(permissionId, { transaction });
      
      if (!permission) {
        await transaction.rollback();
        return errorResponse(
          res,
          ResponseCode.NOT_FOUND,
          'Izin tidak ditemukan'
        );
      }
      
      // Hapus izin (ini akan menghapus juga relasi dengan peran secara otomatis jika diatur CASCADE)
      await permission.destroy({ transaction });
      
      await transaction.commit();
      
      logger.info(`Permission deleted: ${permission.name}`);
      
      return successResponse(
        res,
        ResponseCode.SUCCESS,
        'Izin berhasil dihapus',
        null
      );
    } catch (error) {
      await transaction.rollback();
      logger.error(`Delete permission error: ${error.message}`);
      return errorResponse(
        res,
        ResponseCode.INTERNAL_ERROR,
        'Terjadi kesalahan saat menghapus izin'
      );
    }
  };