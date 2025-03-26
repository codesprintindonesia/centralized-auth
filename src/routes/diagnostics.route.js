/**
 * Rute untuk health check dan diagnostics
 */
import express from 'express';
import { 
  healthCheck,
  serviceStatus,
  databaseStatus,
  systemInfo
} from '../controllers/diagnostics.controller.js';
import { fullAuthentication, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public health check
router.get('/health', healthCheck);

// Protected diagnostics endpoints (hanya untuk admin)
router.get('/status', [
  fullAuthentication,
  requireRole(['admin'])
], serviceStatus);

router.get('/status/database', [
  fullAuthentication,
  requireRole(['admin'])
], databaseStatus);

router.get('/status/system', [
  fullAuthentication,
  requireRole(['admin'])
], systemInfo);

export default router;