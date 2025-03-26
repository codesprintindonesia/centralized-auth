/**
 * Rute untuk manajemen kunci consumer
 */
import express from 'express';
import { getCurrentConsumerPublicKey } from '../controllers/consumer-key.controller.js';
import { authenticateApiKey, authenticateJwt } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/consumers/current/public-key:
 *   get:
 *     tags:
 *       - Consumer Key
 *     summary: Informasi kunci publik consumer
 *     description: Endpoint untuk mendapatkan informasi kunci publik consumer saat ini
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Informasi kunci publik berhasil didapatkan
 *       401:
 *         description: Tidak terautentikasi
 *       404:
 *         description: Consumer tidak ditemukan
 */
router.get('/current/public-key', [
  authenticateApiKey,
  authenticateJwt
], getCurrentConsumerPublicKey);

export default router;