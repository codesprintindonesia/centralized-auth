/**
 * Rute untuk user activity log
 */
import express from 'express';
import { getUserActivityLog } from '../controllers/user-activity.controller.js';
import { validateParams, validateQuery } from '../middlewares/validation.middleware.js';
import { fullAuthentication, requirePermission } from '../middlewares/auth.middleware.js';
import { userIdParamSchema, activityLogQuerySchema } from '../validations/user-activity.validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/users/{userId}/activity:
 *   get:
 *     tags:
 *       - User Activity
 *     summary: Log aktivitas pengguna
 *     description: Endpoint untuk mendapatkan log aktivitas pengguna
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID pengguna
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Halaman yang ingin ditampilkan
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Jumlah data per halaman
 *       - in: query
 *         name: event_type
 *         schema:
 *           type: string
 *           enum: [all, login, logout, token_generated, token_revoked, password_changed, account_locked, account_unlocked]
 *           default: all
 *         description: Tipe event yang ingin ditampilkan
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: "Tanggal mulai (format: YYYY-MM-DD)"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: "Tanggal akhir (format: YYYY-MM-DD)"
 *     responses:
 *       200:
 *         description: Log aktivitas pengguna berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: Pengguna tidak ditemukan
 */
router.get('/:userId/activity', [
  fullAuthentication,
  requirePermission('view_audit_logs'),
  validateParams(userIdParamSchema),
  validateQuery(activityLogQuerySchema)
], getUserActivityLog);

export default router;