 
/**
 * Model User untuk aplikasi otentikasi terpusat
 */
import { DataTypes } from 'sequelize';

/**
 * Inisialisasi model User
 * @param {Sequelize} sequelize - Instance Sequelize
 * @returns {Model} Model User yang telah diinisialisasi
 */
export const initUserModel = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'UUID pengguna sebagai primary key'
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        notEmpty: true
      },
      comment: 'Username untuk login'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true, // Opsional
      unique: true,
      validate: {
        isEmail: true
      },
      comment: 'Email pengguna (opsional)'
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Hash password menggunakan bcrypt'
    },
    salt: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Salt unik untuk setiap pengguna'
    },
    mfa_settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        enabled: false,
        preferred_method: null
      },
      comment: 'Pengaturan Multi-Factor Authentication'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Status aktif pengguna'
    },
    is_locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Status penguncian akun'
    },
    failed_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Jumlah percobaan login gagal'
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Waktu login terakhir'
    },
    password_changed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Waktu terakhir perubahan password'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User yang membuat record ini'
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User yang terakhir mengupdate record ini'
    }
  }, {
    tableName: 'users',
    schema: sequelize.options.searchPath[0], // menggunakan schema yang dikonfigurasi
    timestamps: true, // enables createdAt and updatedAt
    underscored: true, // use snake_case for fields
    hooks: {
      beforeCreate: (user) => {
        // Hook untuk menangani user baru akan ditambahkan di service
      },
      beforeUpdate: (user) => {
        // Hook untuk menangani update user akan ditambahkan di service
      }
    }
  });

  /**
   * Mendapatkan user berdasarkan username
   * @param {string} username - Username yang dicari
   * @returns {Promise<Object>} User yang ditemukan
   */
  User.findByUsername = async function(username) {
    return await this.findOne({
      where: { username, is_active: true }
    });
  };

  /**
   * Mendapatkan user dengan role-nya
   * @param {string} userId - ID user yang dicari
   * @returns {Promise<Object>} User dengan roles
   */
  User.findWithRoles = async function(userId) {
    return await this.findByPk(userId, {
      include: [{
        association: 'Roles',
        through: { attributes: [] } // tidak menyertakan atribut junction table
      }]
    });
  };

  /**
   * Memeriksa apakah user memiliki permission tertentu
   * @param {string} userId - ID user
   * @param {string} permissionName - Nama permission
   * @returns {Promise<boolean>} Hasil pemeriksaan
   */
  User.hasPermission = async function(userId, permissionName) {
    const count = await sequelize.query(`
      SELECT COUNT(*) FROM ${sequelize.options.searchPath[0]}.user_permissions 
      WHERE user_id = :userId AND permission_name = :permissionName
    `, {
      replacements: { userId, permissionName },
      type: sequelize.QueryTypes.SELECT
    });
    
    return count[0].count > 0;
  };

  return User;
};