/**
 * Model Permission untuk aplikasi otentikasi terpusat
 */
import { DataTypes } from 'sequelize';

/**
 * Inisialisasi model Permission
 * @param {Sequelize} sequelize - Instance Sequelize
 * @returns {Model} Model Permission yang telah diinisialisasi
 */
export const initPermissionModel = (sequelize) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'UUID permission sebagai primary key'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Nama permission (unique)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Deskripsi permission'
    },
    resource: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Resource yang dikontrol oleh permission ini'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Aksi yang diizinkan (read, write, delete, dll)'
    }
  }, {
    tableName: 'permissions',
    schema: sequelize.options.searchPath[0], // menggunakan schema yang dikonfigurasi
    timestamps: true, // enables createdAt and updatedAt
    underscored: true, // use snake_case for fields
    indexes: [
      {
        unique: true,
        fields: ['resource', 'action']
      }
    ]
  });

  /**
   * Mendapatkan permission berdasarkan nama
   * @param {string} name - Nama permission yang dicari
   * @returns {Promise<Object>} Permission yang ditemukan
   */
  Permission.findByName = async function(name) {
    return await this.findOne({
      where: { name }
    });
  };

  /**
   * Mendapatkan permission berdasarkan resource dan action
   * @param {string} resource - Resource permission
   * @param {string} action - Action permission
   * @returns {Promise<Object>} Permission yang ditemukan
   */
  Permission.findByResourceAction = async function(resource, action) {
    return await this.findOne({
      where: { resource, action }
    });
  };

  /**
   * Mendapatkan semua permission yang dikelompokkan berdasarkan resource
   * @returns {Promise<Object>} Permission yang dikelompokkan
   */
  Permission.findAllGroupedByResource = async function() {
    const permissions = await this.findAll({
      order: [['resource', 'ASC'], ['action', 'ASC']]
    });
    
    // Kelompokkan berdasarkan resource
    return permissions.reduce((result, permission) => {
      const resource = permission.resource;
      
      if (!result[resource]) {
        result[resource] = [];
      }
      
      result[resource].push(permission);
      return result;
    }, {});
  };

  /**
   * Mendapatkan atau membuat permission baru
   * @param {string} name - Nama permission
   * @param {string} resource - Resource permission
   * @param {string} action - Action permission
   * @param {string} description - Deskripsi permission
   * @returns {Promise<Object>} Permission yang ada atau baru dibuat
   */
  Permission.findOrCreateByName = async function(name, resource, action, description = null) {
    const [permission, created] = await this.findOrCreate({
      where: { name },
      defaults: { resource, action, description }
    });
    
    return { permission, created };
  };

  return Permission;
};