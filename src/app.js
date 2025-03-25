/**
 * Aplikasi utama otentikasi terpusat
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { initHttpServer } from './servers/http.server.js';
import { initHttpsServer } from './servers/https.server.js';
import { logger } from './utils/logger.util.js';
import swaggerSpec from './configs/swagger.config.js';
import routes from './routes/index.route.js';
import { sequelize, syncModels } from './models/index.model.js';
import { testDatabaseConnection } from './configs/database.config.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

/**
 * Initialize application
 */
export const initializeApp = async () => {
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Synchronize models during development (Be careful in production!)
    if (process.env.NODE_ENV === 'development' && process.env.SYNC_DB === 'true') {
      await syncModels(false); // false = no force
      logger.info('Database models synchronized');
    }

    // Create Express app
    const app = express();

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Security middleware
    app.use(helmet());
    app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Consumer-Name', 'X-Signature']
    }));
    
    // Rate limiting middleware can be added here
    // app.use(rateLimit({ ... }));
    
    // Set trust proxy if behind a reverse proxy
    if (process.env.TRUST_PROXY === 'true') {
      app.set('trust proxy', 1);
    }
    
    // Swagger documentation
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }'
    }));

    // Routes
    app.use(routes);

    // Define server configs
    const httpConfig = {
      enabled: process.env.ENABLE_HTTP === 'true',
      port: parseInt(process.env.HTTP_PORT || '3000', 10)
    };

    const httpsConfig = {
      enabled: process.env.ENABLE_HTTPS === 'true',
      port: parseInt(process.env.HTTPS_PORT || '3443', 10),
      sslKeyPath: process.env.SSL_KEY_PATH,
      sslCertPath: process.env.SSL_CERT_PATH,
      sslPassphrase: process.env.SSL_PASSPHRASE
    };

    // Start servers based on configuration
    let httpServer, httpsServer;

    if (httpConfig.enabled) {
      httpServer = initHttpServer(app, httpConfig);
      logger.info(`HTTP server enabled on port ${httpConfig.port}`);
    }

    if (httpsConfig.enabled) {
      if (!httpsConfig.sslKeyPath || !httpsConfig.sslCertPath) {
        logger.error('HTTPS is enabled but SSL key or certificate path is missing');
        process.exit(1);
      }
      
      httpsServer = initHttpsServer(app, httpsConfig);
      logger.info(`HTTPS server enabled on port ${httpsConfig.port}`);
    }

    if (!httpConfig.enabled && !httpsConfig.enabled) {
      logger.error('No server is enabled. Set ENABLE_HTTP=true or ENABLE_HTTPS=true in .env');
      process.exit(1);
    }

    // Unhandled rejection handling
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    return {
      app,
      httpServer,
      httpsServer
    };
  } catch (error) {
    logger.error(`Failed to initialize application: ${error.message}`);
    process.exit(1);
  }
};
 
const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = process.argv[1];

if (path.normalize(currentFilePath) === path.normalize(executedFilePath)) {
  initializeApp();
}