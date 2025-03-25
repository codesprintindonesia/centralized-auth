 
/**
 * Rute untuk otentikasi
 */
import express from 'express';
import { login, verify, logout, me } from '../controllers/auth.controller.js';
import { validateBody } from '../middlewares/validation.middleware.js';
import { loginSchema, verifyTokenSchema, logoutSchema } from '../validations/auth.validation.js';
import { authenticateApiKey, authenticateJwt, verifyRequestSignature, fullAuthentication } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login pengguna
 *     description: Endpoint untuk login pengguna dan mendapatkan token
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login berhasil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Login gagal
 *       422:
 *         description: Validasi gagal
 */
router.post('/login', [
  authenticateApiKey,
  verifyRequestSignature, // Opsional, verifikasi signature jika ada
  validateBody(loginSchema)
], login);

/**
 * @swagger
 * /api/v1/auth/verify:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verifikasi token
 *     description: Endpoint untuk verifikasi validitas token
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyTokenRequest'
 *     responses:
 *       200:
 *         description: Token valid
 *       401:
 *         description: Token tidak valid
 */
router.post('/verify', [
  authenticateApiKey,
  validateBody(verifyTokenSchema)
], verify);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout pengguna
 *     description: Endpoint untuk logout pengguna (revoke token)
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogoutRequest'
 *     responses:
 *       200:
 *         description: Logout berhasil
 *       401:
 *         description: Token tidak valid
 */
router.post('/logout', [
  fullAuthentication,
  validateBody(logoutSchema)
], logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Informasi pengguna saat ini
 *     description: Endpoint untuk mendapatkan informasi pengguna yang sedang login
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan informasi pengguna
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Token tidak valid
 */
router.get('/me', fullAuthentication, me);

export default router;