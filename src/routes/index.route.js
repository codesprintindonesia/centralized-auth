/**
 * Konfigurasi rute utama aplikasi
 */
import express from 'express';
import authRoutes from './auth.route.js';
import userRoutes from './user.route.js';
import adminRoutes from './admin.route.js';
import { notFoundHandler, errorHandler } from '../middlewares/error.middleware.js';

const router = express.Router();

/**
 * Rute untuk health check
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    code: 'SUCCESS',
    message: 'Service is running',
    data: {
      status: 'UP',
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * API versioning
 */
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/admin', adminRoutes);

/**
 * Middleware untuk 404 dan error handling
 */
router.use(notFoundHandler);
router.use(errorHandler);

export default router;