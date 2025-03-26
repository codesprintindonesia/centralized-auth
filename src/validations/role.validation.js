/**
 * Schema validasi untuk endpoint role management
 */
import Joi from 'joi';

/**
 * Schema untuk parameter ID peran
 */
export const roleIdSchema = Joi.object({
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
 * Schema untuk membuat peran baru
 */
export const createRoleSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9_]+$/)
    .messages({
      'string.empty': 'Nama peran tidak boleh kosong',
      'string.min': 'Nama peran minimal {#limit} karakter',
      'string.max': 'Nama peran maksimal {#limit} karakter',
      'string.pattern.base': 'Nama peran hanya boleh mengandung huruf kecil, angka, dan underscore',
      'any.required': 'Nama peran harus diisi'
    }),
  
  description: Joi.string()
    .optional()
    .allow(null, '')
    .max(500)
    .messages({
      'string.max': 'Deskripsi peran maksimal {#limit} karakter'
    }),
  
  priority: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .optional()
    .default(0)
    .messages({
      'number.base': 'Prioritas harus berupa angka',
      'number.integer': 'Prioritas harus berupa bilangan bulat',
      'number.min': 'Prioritas minimal {#limit}',
      'number.max': 'Prioritas maksimal {#limit}'
    }),
  
  permissions: Joi.array()
    .items(Joi.string())
    .optional()
    .default([])
    .messages({
      'array.base': 'Permissions harus berupa array'
    })
});

/**
 * Schema untuk update peran
 */
export const updateRoleSchema = Joi.object({
  description: Joi.string()
    .optional()
    .allow(null, '')
    .max(500)
    .messages({
      'string.max': 'Deskripsi peran maksimal {#limit} karakter'
    }),
  
  priority: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Prioritas harus berupa angka',
      'number.integer': 'Prioritas harus berupa bilangan bulat',
      'number.min': 'Prioritas minimal {#limit}',
      'number.max': 'Prioritas maksimal {#limit}'
    }),
  
  permissions: Joi.array()
    .items(Joi.string())
    .optional()
    .messages({
      'array.base': 'Permissions harus berupa array'
    })
});