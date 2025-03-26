/**
 * Rute untuk manajemen MFA
 */
import express from 'express';
import { 
  setupTotpForUser, 
  verifyAndEnableTotpForUser, 
  disableMfaForUser 
} from '../controllers/mfa.controller.js';
import { validateBody } from '../middlewares/validation.middleware.js';
import { 
  verifyTotpSchema, 
  disableMfaSchema 
} from '../validations/mfa.validation.js';
import { fullAuthentication } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/mfa/totp/setup:
 *   post:
 *     tags:
 *       - MFA
 *     summary: Setup TOTP
 *     description: Setup Time-based One-Time Password untuk user
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: TOTP setup berhasil dibuat
 *       401:
 *         description: Unauthorized
 */
router.post('/totp/setup', fullAuthentication, setupTotpForUser);

/**
 * @swagger
 * /api/v1/mfa/totp/verify:
 *   post:
 *     tags:
 *       - MFA
 *     summary: Verifikasi TOTP
 *     description: Verifikasi dan aktifkan TOTP untuk user
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyTotpRequest'
 *     responses:
 *       200:
 *         description: TOTP berhasil diaktifkan
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation failed
 */
router.post('/totp/verify', [
  fullAuthentication,
  validateBody(verifyTotpSchema)
], verifyAndEnableTotpForUser);

/**
 * @swagger
 * /api/v1/mfa/disable:
 *   post:
 *     tags:
 *       - MFA
 *     summary: Nonaktifkan MFA
 *     description: Nonaktifkan Multi-Factor Authentication untuk user
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisableMfaRequest'
 *     responses:
 *       200:
 *         description: MFA berhasil dinonaktifkan
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation failed
 */
router.post('/disable', [
  fullAuthentication,
  validateBody(disableMfaSchema)
], disableMfaForUser);

export default router;