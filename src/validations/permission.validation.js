/**
 * Schema validasi untuk endpoint permission management
 */
import Joi from 'joi';

/**
 * Schema untuk parameter ID izin
 */
export const permissionIdSchema = Joi.object({
  permissionId: Joi.string()
    .required()
    .guid({ version: 'uuidv4' })
    .messages({
      'string.empty': 'Permission ID tidak boleh kosong',
      'string.guid': 'Permission ID harus berupa UUID v4',
      'any.required': 'Permission ID harus diisi'
    })
});

/**
 * Schema untuk query parameter daftar izin
 */
export const listPermissionsSchema = Joi.object({
  resource: Joi.string()
    .optional()
    .messages({
      'string.base': 'Resource harus berupa string'
    })
});

/**
 * Schema untuk membuat izin baru
 */
export const createPermissionSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(3)
    .max(100)
    .pattern(/^[a-z0-9_]+$/)
    .messages({
      'string.empty': 'Nama izin tidak boleh kosong',
      'string.min': 'Nama izin minimal {#limit} karakter',
      'string.max': 'Nama izin maksimal {#limit} karakter',
      'string.pattern.base': 'Nama izin hanya boleh mengandung huruf kecil, angka, dan underscore',
      'any.required': 'Nama izin harus diisi'
    }),
  
  description: Joi.string()
    .optional()
    .allow(null, '')
    .max(500)
    .messages({
      'string.max': 'Deskripsi izin maksimal {#limit} karakter'
    }),
  
  resource: Joi.string()
    .required()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9_]+$/)
    .messages({
      'string.empty': 'Resource tidak boleh kosong',
      'string.min': 'Resource minimal {#limit} karakter',
      'string.max': 'Resource maksimal {#limit} karakter',
      'string.pattern.base': 'Resource hanya boleh mengandung huruf kecil, angka, dan underscore',
      'any.required': 'Resource harus diisi'
    }),
  
  action: Joi.string()
    .required()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9_]+$/)
    .messages({
      'string.empty': 'Action tidak boleh kosong',
      'string.min': 'Action minimal {#limit} karakter',
      'string.max': 'Action maksimal {#limit} karakter',
      'string.pattern.base': 'Action hanya boleh mengandung huruf kecil, angka, dan underscore',
      'any.required': 'Action harus diisi'
    })
});

/**
 * Schema untuk update izin
 */
export const updatePermissionSchema = Joi.object({
  description: Joi.string()
    .required()
    .allow(null, '')
    .max(500)
    .messages({
      'string.max': 'Deskripsi izin maksimal {#limit} karakter',
      'any.required': 'Deskripsi harus diisi'
    })
});