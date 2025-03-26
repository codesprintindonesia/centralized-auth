/**
 * Rute untuk manajemen izin (permission)
 */
import express from 'express';
import { 
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission
} from '../controllers/permission.controller.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware.js';
import { fullAuthentication, requireRole } from '../middlewares/auth.middleware.js';
import { 
  permissionIdSchema, 
  listPermissionsSchema, 
  createPermissionSchema, 
  updatePermissionSchema 
} from '../validations/permission.validation.js';

const router = express.Router();

// Get all permissions
router.get('/', [
  fullAuthentication,
  requireRole(['admin']),
  validateQuery(listPermissionsSchema)
], getPermissions);

// Create new permission
router.post('/', [
  fullAuthentication,
  requireRole(['admin']),
  validateBody(createPermissionSchema)
], createPermission);

// Update permission
router.put('/:permissionId', [
  fullAuthentication,
  requireRole(['admin']),
  validateParams(permissionIdSchema),
  validateBody(updatePermissionSchema)
], updatePermission);

// Delete permission
router.delete('/:permissionId', [
  fullAuthentication,
  requireRole(['admin']),
  validateParams(permissionIdSchema)
], deletePermission);

export default router;