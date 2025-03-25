 
/**
 * Model Role untuk aplikasi otentikasi terpusat
 */
import { DataTypes } from 'sequelize';

/**
 * Inisialisasi model Role
 * @param {Sequelize} sequelize - Instance Sequelize
 * @returns {Model} Model Role yang telah diinisialisasi
 */
export const initRoleModel = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'UUID role sebagai primary key'
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Nama role (unique)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Deskripsi role'
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Prioritas untuk resolusi konflik'
    }
  }, {
    tableName: 'roles',
    schema: sequelize.options.searchPath[0], // menggunakan schema yang dikonfigurasi
    timestamps: true, // enables createdAt and updatedAt
    underscored: true // use snake_case for fields
  });

  /**
   * Mendapatkan role berdasarkan nama
   * @param {string} name - Nama role yang dicari
   * @returns {Promise<Object>} Role yang ditemukan
   */
  Role.findByName = async function(name) {
    return await this.findOne({
      where: { name }
    });
  };

  /**
   * Mendapatkan role dengan permission-nya
   * @param {string} roleId - ID role yang dicari
   * @returns {Promise<Object>} Role dengan permissions
   */
  Role.findWithPermissions = async function(roleId) {
    return await this.findByPk(roleId, {
      include: [{
        association: 'Permissions',
        through: { attributes: [] } // tidak menyertakan atribut junction table
      }]
    });
  };

  /**
   * Mendapatkan semua role dengan jumlah pengguna
   * @returns {Promise<Array>} Daftar role dengan jumlah pengguna
   */
  Role.findAllWithUserCount = async function() {
    return await this.findAll({
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM ${sequelize.options.searchPath[0]}.user_roles 
              WHERE role_id = "Role".id
            )`),
            'userCount'
          ]
        ]
      },
      order: [['priority', 'DESC']]
    });
  };

  /**
   * Mendapatkan atau membuat role baru
   * @param {string} name - Nama role
   * @param {string} description - Deskripsi role
   * @param {number} priority - Prioritas role
   * @returns {Promise<Object>} Role yang ada atau baru dibuat
   */
  Role.findOrCreateByName = async function(name, description = null, priority = 0) {
    const [role, created] = await this.findOrCreate({
      where: { name },
      defaults: { description, priority }
    });
    
    return { role, created };
  };

  return Role;
};