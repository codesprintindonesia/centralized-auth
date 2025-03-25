/**
 * Schema validasi untuk endpoint otentikasi
 */
import Joi from 'joi';

/**
 * Schema untuk endpoint login
 */
export const loginSchema = Joi.object({
  username: Joi.string()
    .required()
    .min(3)
    .max(50)
    .messages({
      'string.empty': 'Username tidak boleh kosong',
      'string.min': 'Username minimal {#limit} karakter',
      'string.max': 'Username maksimal {#limit} karakter',
      'any.required': 'Username harus diisi'
    }),
  
  password: Joi.string()
    .required()
    .min(8)
    .max(100)
    .messages({
      'string.empty': 'Password tidak boleh kosong',
      'string.min': 'Password minimal {#limit} karakter',
      'string.max': 'Password maksimal {#limit} karakter',
      'any.required': 'Password harus diisi'
    }),
    
  mfa_code: Joi.string()
    .optional()
    .pattern(/^[0-9]{6}$/)
    .messages({
      'string.pattern.base': 'Kode MFA harus berupa 6 digit angka'
    })
});

/**
 * Schema untuk endpoint verifikasi token
 */
export const verifyTokenSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Token tidak boleh kosong',
      'any.required': 'Token harus diisi'
    })
});

/**
 * Schema untuk endpoint refresh token
 */
export const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token tidak boleh kosong',
      'any.required': 'Refresh token harus diisi'
    })
});

/**
 * Schema untuk endpoint logout
 */
export const logoutSchema = Joi.object({
  token: Joi.string()
    .optional()
    .messages({
      'string.empty': 'Token tidak boleh kosong'
    }),
  
  all_devices: Joi.boolean()
    .optional()
    .default(false)
});

/**
 * Schema untuk validasi header otentikasi
 */
export const authHeaderSchema = Joi.object({
  authorization: Joi.string()
    .required()
    .pattern(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+$/)
    .messages({
      'string.empty': 'Token otorisasi tidak boleh kosong',
      'string.pattern.base': 'Format token tidak valid. Harap gunakan format "Bearer {token}"',
      'any.required': 'Token otorisasi diperlukan'
    }),
  
  'x-api-key': Joi.string()
    .required()
    .messages({
      'string.empty': 'API key tidak boleh kosong',
      'any.required': 'API key diperlukan'
    }),
  
  'x-signature': Joi.string()
    .optional()
    .messages({
      'string.empty': 'Signature tidak boleh kosong'
    })
}).unknown(true); // Allow other headers