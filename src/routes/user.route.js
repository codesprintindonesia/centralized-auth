 
/**
 * Rute untuk manajemen pengguna
 */
import express from 'express';
import { 
  getUserDetail, 
  getUsers, 
  addUser, 
  updateUserDetail, 
  updatePassword,
  removeUser,
  getUserActiveTokens,
  revokeUserTokens,
  getUserLoginLogs
} from '../controllers/user.controller.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware.js';
import { 
  createUserSchema, 
  updateUserSchema, 
  changePasswordSchema, 
  userIdSchema,
  listUsersSchema
} from '../validations/user.validation.js';
import { fullAuthentication, requirePermission } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Daftar pengguna
 *     description: Endpoint untuk mendapatkan daftar pengguna dengan filter dan pagination
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
 *         description: Daftar pengguna berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 */
router.get('/', [
  fullAuthentication,
  requirePermission('view_users'),
  validateQuery(listUsersSchema)
], getUsers);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Tambah pengguna baru
 *     description: Endpoint untuk menambahkan pengguna baru
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: Pengguna berhasil dibuat
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       422:
 *         description: Validasi gagal
 */
router.post('/', [
  fullAuthentication,
  requirePermission('create_user'),
  validateBody(createUserSchema)
], addUser);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Detail pengguna
 *     description: Endpoint untuk mendapatkan detail pengguna
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
 *     responses:
 *       200:
 *         description: Detail pengguna berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: Pengguna tidak ditemukan
 */
router.get('/:userId', [
  fullAuthentication,
  requirePermission('view_users'),
  validateParams(userIdSchema)
], getUserDetail);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update pengguna
 *     description: Endpoint untuk mengupdate data pengguna
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: Pengguna berhasil diupdate
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: Pengguna tidak ditemukan
 *       422:
 *         description: Validasi gagal
 */
router.put('/:userId', [
  fullAuthentication,
  requirePermission('update_user'),
  validateParams(userIdSchema),
  validateBody(updateUserSchema)
], updateUserDetail);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Hapus pengguna
 *     description: Endpoint untuk menghapus pengguna
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
 *     responses:
 *       200:
 *         description: Pengguna berhasil dihapus
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: Pengguna tidak ditemukan
 */
router.delete('/:userId', [
  fullAuthentication,
  requirePermission('delete_user'),
  validateParams(userIdSchema)
], removeUser);

/**
 * @swagger
 * /api/v1/users/{userId}/password:
 *   put:
 *     tags:
 *       - Users
 *     summary: Ganti password
 *     description: Endpoint untuk mengganti password pengguna
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password berhasil diubah
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: Pengguna tidak ditemukan
 *       422:
 *         description: Validasi gagal
 */
router.put('/:userId/password', [
  fullAuthentication,
  validateParams(userIdSchema),
  validateBody(changePasswordSchema)
], updatePassword);

/**
 * @swagger
 * /api/v1/users/{userId}/tokens:
 *   get:
 *     tags:
 *       - Users
 *     summary: Daftar token pengguna
 *     description: Endpoint untuk mendapatkan daftar token aktif pengguna
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
 *     responses:
 *       200:
 *         description: Daftar token berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: Pengguna tidak ditemukan
 */
router.get('/:userId/tokens', [
  fullAuthentication,
  requirePermission('view_tokens'),
  validateParams(userIdSchema)
], getUserActiveTokens);

/**
 * @swagger
 * /api/v1/users/{userId}/tokens:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Cabut semua token
 *     description: Endpoint untuk mencabut semua token pengguna
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
 *     responses:
 *       200:
 *         description: Token berhasil dicabut
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: Pengguna tidak ditemukan
 */
router.delete('/:userId/tokens', [
  fullAuthentication,
  requirePermission('revoke_token'),
  validateParams(userIdSchema)
], revokeUserTokens);

/**
 * @swagger
 * /api/v1/users/{userId}/login-history:
 *   get:
 *     tags:
 *       - Users
 *     summary: Riwayat login
 *     description: Endpoint untuk mendapatkan riwayat login pengguna
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
 *     responses:
 *       200:
 *         description: Riwayat login berhasil diambil
 *       401:
 *         description: Tidak terotentikasi
 *       403:
 *         description: Tidak memiliki izin
 *       404:
 *         description: Pengguna tidak ditemukan
 */
router.get('/:userId/login-history', [
  fullAuthentication,
  requirePermission('view_audit_logs'),
  validateParams(userIdSchema)
], getUserLoginLogs);

export default router;