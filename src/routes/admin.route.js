/**
 * Rute untuk administrasi sistem
 */
import express from 'express';
import { 
  getConsumers,
  getConsumerDetail,
  addConsumer,
  updateConsumerDetail,
  regenerateConsumerApiKey,
  removeConsumer,
  getProviderKeys,
  getActiveKey,
  rotateKey,
  revokeKey,
  getSecurityLogs,
  getAuditStats,
  cleanupTokens
} from '../controllers/admin.controller.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware.js';
import { fullAuthentication, requireRole, requirePermission } from '../middlewares/auth.middleware.js';
import {
  consumerIdSchema,
  keyIdSchema,
  createConsumerSchema,
  updateConsumerSchema,
  rotateKeySchema,
  securityLogsQuerySchema,
  cleanupTokensQuerySchema
} from '../validations/admin.validation.js';

const router = express.Router();

// Middleware untuk memastikan pengguna adalah admin
const adminOnly = requireRole('admin');

// ========== API Consumer Routes ==========

/**
 * @swagger
 * /api/v1/admin/consumers:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Daftar API consumer
 *     description: Endpoint untuk mendapatkan daftar API consumer
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Daftar API consumer berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 */
router.get('/consumers', [
  fullAuthentication,
  requirePermission('view_consumers')
], getConsumers);

/**
 * @swagger
 * /api/v1/admin/consumers/{consumerId}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Detail API consumer
 *     description: Endpoint untuk mendapatkan detail API consumer
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: consumerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID API consumer
 *     responses:
 *       200:
 *         description: Detail API consumer berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: API consumer tidak ditemukan
 */
router.get('/consumers/:consumerId', [
  fullAuthentication,
  requirePermission('view_consumers'),
  validateParams(consumerIdSchema)
], getConsumerDetail);

/**
 * @swagger
 * /api/v1/admin/consumers:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Tambah API consumer
 *     description: Endpoint untuk menambahkan API consumer baru
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateConsumerRequest'
 *     responses:
 *       201:
 *         description: API consumer berhasil dibuat
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       422:
 *         description: Validasi gagal
 */
router.post('/consumers', [
  fullAuthentication,
  requirePermission('create_consumer'),
  validateBody(createConsumerSchema)
], addConsumer);

/**
 * @swagger
 * /api/v1/admin/consumers/{consumerId}:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update API consumer
 *     description: Endpoint untuk mengupdate API consumer
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: consumerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID API consumer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateConsumerRequest'
 *     responses:
 *       200:
 *         description: API consumer berhasil diupdate
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: API consumer tidak ditemukan
 *       422:
 *         description: Validasi gagal
 */
router.put('/consumers/:consumerId', [
  fullAuthentication,
  requirePermission('update_consumer'),
  validateParams(consumerIdSchema),
  validateBody(updateConsumerSchema)
], updateConsumerDetail);

/**
 * @swagger
 * /api/v1/admin/consumers/{consumerId}/regenerate-key:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Regenerate API key
 *     description: Endpoint untuk mengenerate ulang API key
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: consumerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID API consumer
 *     responses:
 *       200:
 *         description: API key berhasil digenerate ulang
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: API consumer tidak ditemukan
 */
router.post('/consumers/:consumerId/regenerate-key', [
  fullAuthentication,
  requirePermission('update_consumer'),
  validateParams(consumerIdSchema)
], regenerateConsumerApiKey);

/**
 * @swagger
 * /api/v1/admin/consumers/{consumerId}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Hapus API consumer
 *     description: Endpoint untuk menghapus API consumer
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: consumerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID API consumer
 *     responses:
 *       200:
 *         description: API consumer berhasil dihapus
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: API consumer tidak ditemukan
 */
router.delete('/consumers/:consumerId', [
  fullAuthentication,
  requirePermission('delete_consumer'),
  validateParams(consumerIdSchema)
], removeConsumer);

// ========== Provider Key Routes ==========

/**
 * @swagger
 * /api/v1/admin/keys:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Daftar kunci provider
 *     description: Endpoint untuk mendapatkan daftar kunci provider
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar kunci provider berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 */
router.get('/keys', [
  fullAuthentication,
  requirePermission('view_keys')
], getProviderKeys);

/**
 * @swagger
 * /api/v1/admin/keys/active:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Kunci provider aktif
 *     description: Endpoint untuk mendapatkan kunci provider yang aktif
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Kunci provider aktif berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: Kunci provider aktif tidak ditemukan
 */
router.get('/keys/active', [
  fullAuthentication,
  requirePermission('view_keys')
], getActiveKey);

/**
 * @swagger
 * /api/v1/admin/keys/rotate:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Rotasi kunci provider
 *     description: Endpoint untuk melakukan rotasi kunci provider
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RotateKeyRequest'
 *     responses:
 *       200:
 *         description: Rotasi kunci provider berhasil dilakukan
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 */
router.post('/keys/rotate', [
  fullAuthentication,
  requirePermission('rotate_key'),
  validateBody(rotateKeySchema)
], rotateKey);

/**
 * @swagger
 * /api/v1/admin/keys/{keyId}/revoke:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Cabut kunci provider
 *     description: Endpoint untuk mencabut kunci provider
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kunci provider
 *     responses:
 *       200:
 *         description: Kunci provider berhasil dicabut
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: Kunci provider tidak ditemukan
 */
router.post('/keys/:keyId/revoke', [
  fullAuthentication,
  requirePermission('revoke_key'),
  validateParams(keyIdSchema)
], revokeKey);

// ========== Security Audit Routes ==========

/**
 * @swagger
 * /api/v1/admin/security/logs:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Aktivitas keamanan
 *     description: Endpoint untuk mendapatkan aktivitas keamanan
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
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
 *           default: 20
 *         description: Jumlah data per halaman
 *     responses:
 *       200:
 *         description: Aktivitas keamanan berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 */
router.get('/security/logs', [
  fullAuthentication,
  requirePermission('view_audit_logs'),
  validateQuery(securityLogsQuerySchema)
], getSecurityLogs);

/**
 * @swagger
 * /api/v1/admin/security/stats:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Statistik keamanan
 *     description: Endpoint untuk mendapatkan statistik keamanan
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal mulai
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal akhir
 *     responses:
 *       200:
 *         description: Statistik keamanan berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 */
router.get('/security/stats', [
  fullAuthentication,
  requirePermission('view_audit_logs')
], getAuditStats);

// ========== Maintenance Routes ==========

/**
 * @swagger
 * /api/v1/admin/maintenance/cleanup-tokens:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Bersihkan token kedaluwarsa
 *     description: Endpoint untuk membersihkan token kedaluwarsa
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: older_than_days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Bersihkan token yang lebih lama dari jumlah hari ini
 *     responses:
 *       200:
 *         description: Token kedaluwarsa berhasil dibersihkan
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 */
router.post('/maintenance/cleanup-tokens', [
  fullAuthentication,
  adminOnly,
  validateQuery(cleanupTokensQuerySchema)
], cleanupTokens);

export default router;