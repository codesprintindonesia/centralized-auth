/**
 * Schema validasi untuk endpoint user
 */
import Joi from 'joi';

/**
 * Validasi password
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const passwordMessage = 'Password harus terdiri dari minimal 8 karakter, mengandung huruf besar, huruf kecil, angka, dan karakter khusus';

/**
 * Schema untuk membuat user baru
 */
export const createUserSchema = Joi.object({
  username: Joi.string()
    .required()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .messages({
      'string.empty': 'Username tidak boleh kosong',
      'string.min': 'Username minimal {#limit} karakter',
      'string.max': 'Username maksimal {#limit} karakter',
      'string.pattern.base': 'Username hanya boleh mengandung huruf, angka, underscore, dan dash',
      'any.required': 'Username harus diisi'
    }),
  
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Format email tidak valid'
    }),
  
  password: Joi.string()
    .required()
    .min(8)
    .max(100)
    .pattern(passwordRegex)
    .messages({
      'string.empty': 'Password tidak boleh kosong',
      'string.min': 'Password minimal {#limit} karakter',
      'string.max': 'Password maksimal {#limit} karakter',
      'string.pattern.base': passwordMessage,
      'any.required': 'Password harus diisi'
    }),
  
  roles: Joi.array()
    .items(Joi.string())
    .optional()
    .default([])
    .messages({
      'array.base': 'Roles harus berupa array'
    })
});

/**
 * Schema untuk update user
 */
export const updateUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .optional()
    .allow(null, '')
    .messages({
      'string.email': 'Format email tidak valid'
    }),
  
  is_active: Joi.boolean()
    .optional(),
  
  is_locked: Joi.boolean()
    .optional(),
  
  roles: Joi.array()
    .items(Joi.string())
    .optional()
    .messages({
      'array.base': 'Roles harus berupa array'
    })
});

/**
 * Schema untuk ganti password
 */
export const changePasswordSchema = Joi.object({
  current_password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password saat ini tidak boleh kosong',
      'any.required': 'Password saat ini harus diisi'
    }),
  
  new_password: Joi.string()
    .required()
    .min(8)
    .max(100)
    .pattern(passwordRegex)
    .invalid(Joi.ref('current_password'))
    .messages({
      'string.empty': 'Password baru tidak boleh kosong',
      'string.min': 'Password baru minimal {#limit} karakter',
      'string.max': 'Password baru maksimal {#limit} karakter',
      'string.pattern.base': passwordMessage,
      'any.invalid': 'Password baru tidak boleh sama dengan password saat ini',
      'any.required': 'Password baru harus diisi'
    })
});

/**
 * Schema untuk reset password oleh admin
 */
export const resetPasswordSchema = Joi.object({
  new_password: Joi.string()
    .required()
    .min(8)
    .max(100)
    .pattern(passwordRegex)
    .messages({
      'string.empty': 'Password baru tidak boleh kosong',
      'string.min': 'Password baru minimal {#limit} karakter',
      'string.max': 'Password baru maksimal {#limit} karakter',
      'string.pattern.base': passwordMessage,
      'any.required': 'Password baru harus diisi'
    })
});

/**
 * Schema untuk filter dan paginasi daftar users
 */
export const listUsersSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page harus berupa angka',
      'number.integer': 'Page harus berupa bilangan bulat',
      'number.min': 'Page minimal {#limit}'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit harus berupa angka',
      'number.integer': 'Limit harus berupa bilangan bulat',
      'number.min': 'Limit minimal {#limit}',
      'number.max': 'Limit maksimal {#limit}'
    }),
  
  sort_by: Joi.string()
    .valid('username', 'email', 'created_at', 'last_login', 'is_active')
    .default('created_at')
    .messages({
      'string.base': 'Sort by harus berupa string',
      'any.only': 'Sort by tidak valid'
    }),
  
  sort_order: Joi.string()
    .valid('asc', 'desc', 'ASC', 'DESC')
    .default('DESC')
    .messages({
      'string.base': 'Sort order harus berupa string',
      'any.only': 'Sort order tidak valid'
    }),
  
  username: Joi.string()
    .optional()
    .messages({
      'string.base': 'Username harus berupa string'
    }),
  
  email: Joi.string()
    .optional()
    .messages({
      'string.base': 'Email harus berupa string'
    }),
  
  is_active: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Is active harus berupa boolean'
    }),
  
  is_locked: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Is locked harus berupa boolean'
    }),
    
  role: Joi.string()
    .optional()
    .messages({
      'string.base': 'Role harus berupa string'
    })
});

/**
 * Schema untuk parameter ID pengguna
 */
export const userIdSchema = Joi.object({
  userId: Joi.string()
    .required()
    .guid({ version: 'uuidv4' })
    .messages({
      'string.empty': 'User ID tidak boleh kosong',
      'string.guid': 'User ID harus berupa UUID v4',
      'any.required': 'User ID harus diisi'
    })
});