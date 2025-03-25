/**
 * Konfigurasi Swagger untuk dokumentasi API
 */
import swaggerJsDoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Mendapatkan __dirname equivalent di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mencari file Swagger YAML secara rekursif
const getSwaggerFiles = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Rekursif untuk subdirektori
      results = results.concat(getSwaggerFiles(filePath));
    } else {
      // Cek apakah file JS atau YAML yang mungkin berisi anotasi Swagger
      if (
        file.endsWith('.js') || 
        file.endsWith('.yaml') || 
        file.endsWith('.yml')
      ) {
        results.push(filePath);
      }
    }
  });
  
  return results;
};

/**
 * Opsi konfigurasi Swagger
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Centralized Authentication API',
      version: '1.0.0',
      description: 'API untuk sistem otentikasi terpusat dengan signature asimetris',
      contact: {
        name: 'Admin',
        email: 'admin@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key untuk autentikasi consumer'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token untuk autentikasi pengguna'
        },
        SignatureAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Signature',
          description: 'Tanda tangan digital untuk verifikasi integritas request'
        }
      },
      schemas: {
        // Response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Kode respons',
              example: 'SUCCESS'
            },
            message: {
              type: 'string',
              description: 'Pesan sukses',
              example: 'Operasi berhasil'
            },
            data: {
              type: 'object',
              description: 'Data hasil operasi'
            },
            meta: {
              type: 'object',
              description: 'Metadata tambahan (opsional)'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Kode error',
              example: 'UNAUTHORIZED'
            },
            message: {
              type: 'string',
              description: 'Pesan error',
              example: 'Invalid username or password'
            },
            errors: {
              type: 'array',
              description: 'Detail error (jika ada)',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'username'
                  },
                  message: {
                    type: 'string',
                    example: 'Username cannot be empty'
                  },
                  value: {
                    type: 'string',
                    example: ''
                  }
                }
              }
            }
          }
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            pagination: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  example: 100
                },
                page: {
                  type: 'integer',
                  example: 1
                },
                limit: {
                  type: 'integer',
                  example: 10
                },
                totalPages: {
                  type: 'integer',
                  example: 10
                }
              }
            }
          }
        },
        
        // Authentication schemas
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              example: 'admin'
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'Admin123!'
            },
            mfa_code: {
              type: 'string',
              example: '123456',
              description: 'Kode MFA 6 digit (jika MFA diaktifkan)'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              example: 'SUCCESS'
            },
            message: {
              type: 'string',
              example: 'Login berhasil'
            },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                expires_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2023-01-01T00:00:00Z'
                },
                user: {
                  $ref: '#/components/schemas/User'
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            username: {
              type: 'string',
              example: 'admin'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@example.com'
            },
            roles: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['admin', 'user_manager']
            }
          }
        },
        VerifyTokenRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        VerifyTokenResponse: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              example: 'SUCCESS'
            },
            message: {
              type: 'string',
              example: 'Token valid'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                }
              }
            }
          }
        },
        LogoutRequest: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            all_devices: {
              type: 'boolean',
              default: false,
              description: 'Jika true, semua token pengguna akan dicabut'
            }
          }
        },
        
        // User schemas
        CreateUserRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              example: 'johndoe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'StrongP@ss123!'
            },
            roles: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['standard_user']
            }
          }
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john.updated@example.com'
            },
            is_active: {
              type: 'boolean',
              example: true
            },
            is_locked: {
              type: 'boolean',
              example: false
            },
            roles: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['standard_user', 'api_manager']
            }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['current_password', 'new_password'],
          properties: {
            current_password: {
              type: 'string',
              format: 'password',
              example: 'OldPassword123!'
            },
            new_password: {
              type: 'string',
              format: 'password',
              example: 'NewStrongP@ss456!'
            }
          }
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['new_password'],
          properties: {
            new_password: {
              type: 'string',
              format: 'password',
              example: 'NewStrongP@ss456!'
            }
          }
        },
        
        // Admin schemas - API Consumer
        CreateConsumerRequest: {
          type: 'object',
          required: ['name', 'publicKey'],
          properties: {
            name: {
              type: 'string',
              example: 'MyAppConsumer'
            },
            publicKey: {
              type: 'string',
              example: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w...\n-----END PUBLIC KEY-----'
            },
            keyAlgorithm: {
              type: 'string',
              example: 'RSA-2048',
              default: 'RSA-2048',
              enum: ['RSA-2048', 'RSA-4096', 'ECDSA-P256', 'Ed25519']
            },
            allowedIps: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['192.168.1.1/32', '10.0.0.0/24']
            }
          }
        },
        UpdateConsumerRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'UpdatedAppConsumer'
            },
            publicKey: {
              type: 'string',
              example: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w...\n-----END PUBLIC KEY-----'
            },
            allowedIps: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['192.168.1.1/32', '10.0.0.0/24']
            },
            isActive: {
              type: 'boolean',
              example: true
            }
          }
        },
        
        // Admin schemas - Provider Key
        RotateKeyRequest: {
          type: 'object',
          properties: {
            keyAlgorithm: {
              type: 'string',
              example: 'RSA-2048',
              enum: ['RSA-2048', 'RSA-4096', 'ECDSA-P256', 'Ed25519']
            },
            validDays: {
              type: 'integer',
              minimum: 1,
              maximum: 365,
              example: 90,
              default: 90
            }
          }
        }
      }
    },
    security: [
      {
        ApiKeyAuth: [],
        BearerAuth: []
      }
    ]
  },
  apis: [
    // Route files
    path.join(__dirname, '../routes/*.js')
  ]
};

// Dynamically add all JS files from routes directory
try {
  const routesDir = path.join(__dirname, '../routes');
  if (fs.existsSync(routesDir)) {
    const routeFiles = getSwaggerFiles(routesDir);
    swaggerOptions.apis = routeFiles;
  }
} catch (error) {
  console.error('Error scanning route files for Swagger:', error);
}

/**
 * Generate spesifikasi Swagger dari opsi
 */
const swaggerSpec = swaggerJsDoc(swaggerOptions);

export default swaggerSpec;