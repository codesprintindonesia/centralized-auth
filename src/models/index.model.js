/**
 * Index model untuk aplikasi otentikasi terpusat
 * Menginisialisasi dan mengekspor semua model untuk aplikasi
 */
import { sequelize } from '../configs/database.config.js';
import { initUserModel } from './user.model.js';
import { initRoleModel } from './role.model.js';
import { initPermissionModel } from './permission.model.js';
import { initConsumerModel } from './consumer.model.js';
import { initProviderKeyModel } from './provider-key.model.js';
import { initTokenModel } from './token.model.js';
import { initAuditLogModel } from './audit.model.js';
import { logger } from '../utils/logger.util.js';

// Inisialisasi model-model
const UserModel = initUserModel(sequelize);
const RoleModel = initRoleModel(sequelize);
const PermissionModel = initPermissionModel(sequelize);
const ConsumerModel = initConsumerModel(sequelize);
const ProviderKeyModel = initProviderKeyModel(sequelize);
const TokenModel = initTokenModel(sequelize);
const AuditLogModel = initAuditLogModel(sequelize);

// Setup relasi antar model
const setupAssociations = () => {
  // User - Role (Many-to-Many)
  UserModel.belongsToMany(RoleModel, { 
    through: 'user_roles',
    foreignKey: 'user_id',
    otherKey: 'role_id',
    timestamps: true
  });
  
  RoleModel.belongsToMany(UserModel, { 
    through: 'user_roles',
    foreignKey: 'role_id',
    otherKey: 'user_id',
    timestamps: true
  });

  // Role - Permission (Many-to-Many)
  RoleModel.belongsToMany(PermissionModel, { 
    through: 'role_permissions',
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    timestamps: true
  });
  
  PermissionModel.belongsToMany(RoleModel, { 
    through: 'role_permissions',
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    timestamps: true
  });

  // User - Token (One-to-Many)
  UserModel.hasMany(TokenModel, { 
    foreignKey: 'user_id' 
  });
  
  TokenModel.belongsTo(UserModel, { 
    foreignKey: 'user_id' 
  });

  // Consumer - Token (One-to-Many)
  ConsumerModel.hasMany(TokenModel, { 
    foreignKey: 'consumer_id' 
  });
  
  TokenModel.belongsTo(ConsumerModel, { 
    foreignKey: 'consumer_id' 
  });

  // ProviderKey - Token (One-to-Many)
  ProviderKeyModel.hasMany(TokenModel, { 
    foreignKey: 'provider_key_id' 
  });
  
  TokenModel.belongsTo(ProviderKeyModel, { 
    foreignKey: 'provider_key_id' 
  });

  // User - AuditLog (One-to-Many)
  UserModel.hasMany(AuditLogModel, { 
    foreignKey: 'user_id' 
  });
  
  AuditLogModel.belongsTo(UserModel, { 
    foreignKey: 'user_id' 
  });

  // Consumer - AuditLog (One-to-Many)
  ConsumerModel.hasMany(AuditLogModel, { 
    foreignKey: 'consumer_id' 
  });
  
  AuditLogModel.belongsTo(ConsumerModel, { 
    foreignKey: 'consumer_id' 
  });

  logger.info('Model associations setup completed');
};

// Setup relasi antar model
setupAssociations();

// Sinkronisasi model jika diperlukan (hanya untuk development)
const syncModels = async (force = false) => {
  if (process.env.NODE_ENV === 'development' && force) {
    try {
      await sequelize.sync({ force });
      logger.info(`Database synchronized ${force ? 'with force' : ''}`);
    } catch (error) {
      logger.error(`Failed to synchronize database: ${error.message}`);
      throw error;
    }
  }
};

// Export semua model dan sequelize instance
export {
  sequelize,
  UserModel,
  RoleModel,
  PermissionModel,
  ConsumerModel,
  ProviderKeyModel,
  TokenModel,
  AuditLogModel,
  syncModels
};