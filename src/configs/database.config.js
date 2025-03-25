 
/**
 * Konfigurasi database untuk aplikasi otentikasi terpusat
 */
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.util.js';

// Load environment variables
dotenv.config();

// Konfigurasi koneksi database
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'centralized_authentication',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  schema: process.env.DB_SCHEMA || 'auth',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' 
    ? (msg) => logger.debug(msg) 
    : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true // Sequelize akan menggunakan snake_case untuk nama kolom
  }
};

// Inisialisasi Sequelize
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define,
    dialectOptions: {
      // Opsi Postgres tambahan
      statement_timeout: 30000, // timeout 30 detik
      application_name: 'centralized-auth'
    },
    // Set schema default
    searchPath: [dbConfig.schema, 'public']
  }
);

// Fungsi untuk menguji koneksi database
export const testDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Koneksi database berhasil dibuat');
    return true;
  } catch (error) {
    logger.error(`Tidak dapat terhubung ke database: ${error.message}`);
    return false;
  }
};

export { sequelize, dbConfig };