/**
 * Schema validasi untuk endpoint admin
 */
import Joi from 'joi';

/**
 * Schema untuk parameter ID consumer
 */
export const consumerIdSchema = Joi.object({
  consumerId: Joi.string()
    .required()
    .guid({ version: 'uuidv4' })
    .messages({
      'string.empty': 'Consumer ID tidak boleh kosong',
      'string.guid': 'Consumer ID harus berupa UUID v4',
      'any.required': 'Consumer ID harus diisi'
    })
});

/**
 * Schema untuk parameter ID kunci
 */
export const keyIdSchema = Joi.object({
  keyId: Joi.string()
    .required()
    .guid({ version: 'uuidv4' })
    .messages({
      'string.empty': 'Key ID tidak boleh kosong',
      'string.guid': 'Key ID harus berupa UUID v4',
      'any.required': 'Key ID harus diisi'
    })
});

/**
 * Schema untuk membuat API consumer baru
 */
export const createConsumerSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(3)
    .max(100)
    .messages({
      'string.empty': 'Nama consumer tidak boleh kosong',
      'string.min': 'Nama consumer minimal {#limit} karakter',
      'string.max': 'Nama consumer maksimal {#limit} karakter',
      'any.required': 'Nama consumer harus diisi'
    }),
  publicKey: Joi.string()
    .required()
    .messages({
      'string.empty': 'Public key tidak boleh kosong',
      'any.required': 'Public key harus diisi'
    }),
  keyAlgorithm: Joi.string()
    .valid('RSA-2048', 'RSA-4096', 'ECDSA-P256', 'Ed25519')
    .default('RSA-2048')
    .messages({
      'string.empty': 'Algoritma kunci tidak boleh kosong',
      'any.only': 'Algoritma kunci tidak valid'
    }),
  allowedIps: Joi.array()
    .items(Joi.string())
    .default([])
    .messages({
      'array.base': 'Allowed IPs harus berupa array'
    })
});

/**
 * Schema untuk update API consumer
 */
export const updateConsumerSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .messages({
      'string.empty': 'Nama consumer tidak boleh kosong',
      'string.min': 'Nama consumer minimal {#limit} karakter',
      'string.max': 'Nama consumer maksimal {#limit} karakter'
    }),
  publicKey: Joi.string()
    .messages({
      'string.empty': 'Public key tidak boleh kosong'
    }),
  allowedIps: Joi.array()
    .items(Joi.string())
    .messages({
      'array.base': 'Allowed IPs harus berupa array'
    }),
  isActive: Joi.boolean()
    .messages({
      'boolean.base': 'Status aktif harus berupa boolean'
    })
});

/**
 * Schema untuk rotasi kunci provider
 */
export const rotateKeySchema = Joi.object({
  keyAlgorithm: Joi.string()
    .valid('RSA-2048', 'RSA-4096', 'ECDSA-P256', 'Ed25519')
    .default('RSA-2048')
    .messages({
      'string.empty': 'Algoritma kunci tidak boleh kosong',
      'any.only': 'Algoritma kunci tidak valid'
    }),
  validDays: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(90)
    .messages({
      'number.base': 'Masa berlaku harus berupa angka',
      'number.integer': 'Masa berlaku harus berupa bilangan bulat',
      'number.min': 'Masa berlaku minimal {#limit} hari',
      'number.max': 'Masa berlaku maksimal {#limit} hari'
    })
});

/**
 * Schema untuk filter dan paginasi security logs
 */
export const securityLogsQuerySchema = Joi.object({
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
    .default(20)
    .messages({
      'number.base': 'Limit harus berupa angka',
      'number.integer': 'Limit harus berupa bilangan bulat',
      'number.min': 'Limit minimal {#limit}',
      'number.max': 'Limit maksimal {#limit}'
    }),
  user_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .messages({
      'string.guid': 'User ID harus berupa UUID v4'
    }),
  consumer_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .messages({
      'string.guid': 'Consumer ID harus berupa UUID v4'
    }),
  event_type: Joi.string()
    .valid('login', 'logout', 'failed_login', 'token_generated', 'token_revoked', 'password_changed', 'account_locked', 'account_unlocked')
    .messages({
      'any.only': 'Event type tidak valid'
    }),
  status: Joi.string()
    .valid('success', 'failure')
    .messages({
      'any.only': 'Status tidak valid'
    }),
  start_date: Joi.date()
    .iso()
    .messages({
      'date.base': 'Tanggal mulai harus berupa tanggal',
      'date.format': 'Tanggal mulai harus berformat ISO'
    }),
  end_date: Joi.date()
    .iso()
    .min(Joi.ref('start_date'))
    .messages({
      'date.base': 'Tanggal akhir harus berupa tanggal',
      'date.format': 'Tanggal akhir harus berformat ISO',
      'date.min': 'Tanggal akhir harus setelah tanggal mulai'
    })
});

/**
 * Schema untuk parameter cleanup token
 */
export const cleanupTokensQuerySchema = Joi.object({
  older_than_days: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30)
    .messages({
      'number.base': 'Hari harus berupa angka',
      'number.integer': 'Hari harus berupa bilangan bulat',
      'number.min': 'Hari minimal {#limit}',
      'number.max': 'Hari maksimal {#limit}'
    })
});