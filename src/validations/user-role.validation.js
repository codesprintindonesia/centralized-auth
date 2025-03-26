/**
 * Schema validasi untuk endpoint user-role management
 */
import Joi from 'joi';

/**
 * Schema untuk parameter user dan role ID
 */
export const userRoleParamsSchema = Joi.object({
  userId: Joi.string()
    .required()
    .guid({ version: 'uuidv4' })
    .messages({
      'string.empty': 'User ID tidak boleh kosong',
      'string.guid': 'User ID harus berupa UUID v4',
      'any.required': 'User ID harus diisi'
    }),
  
  roleId: Joi.string()
    .required()
    .guid({ version: 'uuidv4' })
    .messages({
      'string.empty': 'Role ID tidak boleh kosong',
      'string.guid': 'Role ID harus berupa UUID v4',
      'any.required': 'Role ID harus diisi'
    })
});

/**
 * Schema untuk parameter user ID
 */
export const userIdParamSchema = Joi.object({
  userId: Joi.string()
    .required()
    .guid({ version: 'uuidv4' })
    .messages({
      'string.empty': 'User ID tidak boleh kosong',
      'string.guid': 'User ID harus berupa UUID v4',
      'any.required': 'User ID harus diisi'
    })
});

/**
 * Schema untuk menetapkan peran ke pengguna
 */
export const assignRolesSchema = Joi.object({
  roles: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.base': 'Roles harus berupa array',
      'array.min': 'Minimal satu peran harus dipilih',
      'any.required': 'Roles harus diisi'
    })
});