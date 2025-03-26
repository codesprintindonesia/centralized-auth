/**
 * Rute untuk manajemen peran (role)
 */
import express from 'express';
import { 
  getRoles,
  getRoleDetail,
  createRole,
  updateRole,
  deleteRole
} from '../controllers/role.controller.js';
import { validateBody, validateParams } from '../middlewares/validation.middleware.js';
import { fullAuthentication, requireRole } from '../middlewares/auth.middleware.js';
import { roleIdSchema, createRoleSchema, updateRoleSchema } from '../validations/role.validation.js';

const router = express.Router();

// Get all roles
router.get('/', [
  fullAuthentication,
  requireRole(['admin'])
], getRoles);

// Get role detail
router.get('/:roleId', [
  fullAuthentication,
  requireRole(['admin']),
  validateParams(roleIdSchema)
], getRoleDetail);

// Create new role
router.post('/', [
  fullAuthentication,
  requireRole(['admin']),
  validateBody(createRoleSchema)
], createRole);

// Update role
router.put('/:roleId', [
  fullAuthentication,
  requireRole(['admin']),
  validateParams(roleIdSchema),
  validateBody(updateRoleSchema)
], updateRole);

// Delete role
router.delete('/:roleId', [
  fullAuthentication,
  requireRole(['admin']),
  validateParams(roleIdSchema)
], deleteRole);

export default router;