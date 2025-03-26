/**
 * Rute untuk manajemen user-role (penugasan peran ke pengguna)
 */
import express from 'express';
import { 
  getUserRoles,
  assignRolesToUser,
  removeRoleFromUser
} from '../controllers/user-role.controller.js';
import { validateBody, validateParams } from '../middlewares/validation.middleware.js';
import { fullAuthentication, requireRole } from '../middlewares/auth.middleware.js';
import { 
  userRoleParamsSchema, 
  userIdParamSchema, 
  assignRolesSchema 
} from '../validations/user-role.validation.js';

const router = express.Router();

// Get user's roles
router.get('/:userId/roles', [
  fullAuthentication,
  requireRole(['admin']),
  validateParams(userIdParamSchema)
], getUserRoles);

// Assign roles to user
router.post('/:userId/roles', [
  fullAuthentication,
  requireRole(['admin']),
  validateParams(userIdParamSchema),
  validateBody(assignRolesSchema)
], assignRolesToUser);

// Remove role from user
router.delete('/:userId/roles/:roleId', [
  fullAuthentication,
  requireRole(['admin']),
  validateParams(userRoleParamsSchema)
], removeRoleFromUser);

export default router;