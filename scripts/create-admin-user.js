/**
 * Script untuk membuat user admin pertama
 */
import { sequelize, UserModel, RoleModel } from '../src/models/index.model.js';
import { hashPassword } from '../src/services/crypto.service.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdminUser = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established');

    // Sinkronkan model dengan database jika belum ada
    console.log('Syncing database models...');
    await sequelize.sync();
    console.log('Database models synced');

    const transaction = await sequelize.transaction();
    
    try {
      // Buat role admin jika belum ada
      console.log('Creating admin role if not exists...');
      
      // Gunakan cara manual untuk menghindari masalah timestamp
      const existingRole = await RoleModel.findOne({
        where: { name: 'admin' },
        transaction
      });
      
      let adminRole;
      
      if (!existingRole) {
        adminRole = await RoleModel.create({
          name: 'admin',
          description: 'Administrator role',
          priority: 100
        }, { 
          transaction,
          fields: ['id', 'name', 'description', 'priority'] // Specify the fields explicitly
        });
        console.log('Admin role created');
      } else {
        adminRole = existingRole;
        console.log('Admin role already exists');
      }
      
      // Cek apakah user admin sudah ada
      console.log('Checking if admin user exists...');
      const existingAdmin = await UserModel.findOne({
        where: { username: 'admin' },
        transaction
      });

      if (existingAdmin) {
        console.log('Admin user already exists with ID:', existingAdmin.id);
        await transaction.commit();
        return;
      }

      // Hash password
      console.log('Creating admin user...');
      const { hash, salt } = await hashPassword('Admin123!');
      
      // Buat user admin menggunakan cara yang lebih eksplisit untuk menghindari masalah timestamp
      const adminUser = await UserModel.create({
        username: 'admin',
        email: 'admin@example.com',
        password_hash: hash,
        salt,
        is_active: true,
        mfa_settings: { enabled: false }
      }, { 
        transaction,
        fields: ['id', 'username', 'email', 'password_hash', 'salt', 'is_active', 'mfa_settings'] // Specify the fields explicitly
      });
      
      // Tambahkan relasi melalui query langsung untuk menghindari masalah timestamp
      console.log('Assigning admin role to user...');
      await sequelize.query(
        `INSERT INTO ${sequelize.options.searchPath[0]}.user_roles (user_id, role_id) VALUES (:userId, :roleId)`,
        {
          replacements: { userId: adminUser.id, roleId: adminRole.id },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
      
      await transaction.commit();
      
      console.log('Admin user created successfully:');
      console.log('Username: admin');
      console.log('Password: Admin123!');
      console.log('User ID:', adminUser.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
    // Close connection
    await sequelize.close();
  } catch (error) {
    console.error('Error creating admin user:', error);
    console.error(error.stack);
  }
};

createAdminUser();