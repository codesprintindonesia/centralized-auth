/**
 * Schema validasi untuk endpoint user activity log
 */
import Joi from 'joi';

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
 * Schema untuk query parameter activity log
 */
export const activityLogQuerySchema = Joi.object({
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
  
  event_type: Joi.string()
    .valid('all', 'login', 'logout', 'token_generated', 'token_revoked', 'password_changed', 'account_locked', 'account_unlocked')
    .default('all')
    .messages({
      'any.only': 'Event type tidak valid'
    }),
  
  start_date: Joi.date()
    .iso()
    .messages({
      'date.base': 'Start date harus berupa tanggal',
      'date.format': 'Start date harus dalam format ISO'
    }),
  
  end_date: Joi.date()
    .iso()
    .min(Joi.ref('start_date'))
    .messages({
      'date.base': 'End date harus berupa tanggal',
      'date.format': 'End date harus dalam format ISO',
      'date.min': 'End date harus setelah start date'
    })
});