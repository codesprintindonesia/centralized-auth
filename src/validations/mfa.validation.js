/**
 * Schema validasi untuk endpoint MFA
 */
import Joi from 'joi';

/**
 * Schema untuk verifikasi TOTP
 */
export const verifyTotpSchema = Joi.object({
  token: Joi.string()
    .required()
    .pattern(/^[0-9]{6}$/)
    .messages({
      'string.empty': 'Token TOTP tidak boleh kosong',
      'string.pattern.base': 'Token TOTP harus berupa 6 digit angka',
      'any.required': 'Token TOTP harus diisi'
    })
});

/**
 * Schema untuk nonaktifkan MFA
 */
export const disableMfaSchema = Joi.object({
  current_password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password saat ini tidak boleh kosong',
      'any.required': 'Password saat ini harus diisi'
    })
});