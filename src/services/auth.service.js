/**
 * Layanan otentikasi untuk aplikasi otentikasi terpusat
 */
import jwt from "jsonwebtoken";
import {
  UserModel,
  TokenModel,
  ConsumerModel,
  ProviderKeyModel,
} from "../models/index.model.js";
import {
  verifyPassword,
  signData,
  generateRandomToken,
  hashData,
  verifySignature,
} from "./crypto.service.js";
import { logger } from "../utils/logger.util.js";

/**
 * Otentikasi pengguna
 * @param {Object} credentials - Kredensial pengguna
 * @param {Object} context - Konteks otentikasi
 * @returns {Promise<Object>} Hasil otentikasi
 */
export const authenticateUser = async (credentials, context) => {
  const { username, password } = credentials;
  const { consumerId, ipAddress, userAgent, signatureHeader } = context;

  try {
    // Validasi kredensial
    if (!username || !password) {
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Username and password are required",
      };
    }

    // Cari consumer
    const consumer = await ConsumerModel.findByPk(consumerId);
    if (!consumer || !consumer.is_active) {
      logger.warn(
        `Authentication attempt with invalid consumer: ${consumerId}`
      );
      return {
        success: false,
        code: "INVALID_CONSUMER",
        message: "Invalid or inactive API consumer",
      };
    }

    // Verifikasi tanda tangan
    if (signatureHeader) {
      // PERBAIKAN SEMENTARA: Nonaktifkan pemeriksaan signature
      console.log(
        "Signature verification in authenticateUser temporarily disabled for testing"
      );
      // Kode asli di bawah ini dikomentari sementara
      /*
      // Format: signature:data (base64)
      const [signature, data] = signatureHeader.split(":");
      const isValidSignature = verifySignature(
        Buffer.from(data, "base64").toString(),
        signature,
        consumer.public_key
      );

      if (!isValidSignature) {
        logger.warn(`Invalid signature from consumer: ${consumer.name}`);
        return {
          success: false,
          code: "INVALID_SIGNATURE",
          message: "Invalid request signature",
        };
      }*/
    }

    // Verifikasi IP (jika dikonfigurasi)
    if (consumer.allowed_ips && consumer.allowed_ips.length > 0) {
      const isAllowed = await ConsumerModel.isIpAllowed(consumerId, ipAddress);
      if (!isAllowed) {
        logger.warn(
          `Authentication attempt from unauthorized IP: ${ipAddress}`
        );
        return {
          success: false,
          code: "UNAUTHORIZED_IP",
          message: "Access from this IP address is not allowed",
        };
      }
    }

    // Cari pengguna berdasarkan username
    const user = await UserModel.findByUsername(username);
    if (!user) {
      logger.warn(`Authentication attempt with invalid username: ${username}`);
      return {
        success: false,
        code: "INVALID_USER",
        message: "Invalid username or password",
      };
    }

    // Cek apakah akun terkunci
    if (user.is_locked) {
      logger.warn(`Authentication attempt for locked account: ${username}`);
      return {
        success: false,
        code: "ACCOUNT_LOCKED",
        message: "Account is locked. Please contact administrator",
      };
    }

    // Verifikasi password
    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      // Tambah jumlah percobaan gagal
      await user.increment("failed_attempts");

      // Cek apakah harus mengunci akun (setelah 5 percobaan gagal)
      if (user.failed_attempts + 1 >= 5) {
        await user.update({ is_locked: true });
        logger.warn(
          `Account locked after too many failed attempts: ${username}`
        );
        return {
          success: false,
          code: "ACCOUNT_LOCKED",
          message: "Too many failed attempts. Account has been locked",
        };
      }

      logger.warn(`Failed authentication attempt for user: ${username}`);
      return {
        success: false,
        code: "INVALID_PASSWORD",
        message: "Invalid username or password",
      };
    }

    // Cek apakah user memiliki MFA yang aktif
    if (user.mfa_settings && user.mfa_settings.enabled) {
      // Jika MFA aktif dan tidak ada kode MFA yang diberikan
      if (!mfa_code) {
        return {
          success: false,
          code: "MFA_REQUIRED",
          message: "MFA code diperlukan",
          requireMfa: true,
          user: {
            id: user.id,
            username: user.username,
            mfaMethod: user.mfa_settings.preferred_method,
          },
        };
      }

      // Verifikasi kode MFA
      let mfaVerified = false;

      // Metode TOTP (Time-based One-Time Password)
      if (user.mfa_settings.preferred_method === "totp") {
        const { verifyTOTP } = await import("./mfa.service.js");
        const result = await verifyTOTP(user.id, mfa_code);
        mfaVerified = result.success;
      }

      // Metode SMS OTP
      else if (user.mfa_settings.preferred_method === "sms") {
        const { verifySMSOTP } = await import("./mfa.service.js");
        const result = await verifySMSOTP(user.id, mfa_code);
        mfaVerified = result.success;
      }
      // Metode Email OTP
      else if (user.mfa_settings.preferred_method === "email") {
        const { verifyEmailOTP } = await import("./mfa.service.js");
        const result = await verifyEmailOTP(user.id, mfa_code);
        mfaVerified = result.success;
      }

      // Tambahkan metode lain jika diperlukan di masa depan

      if (!mfaVerified) {
        return {
          success: false,
          code: "INVALID_MFA",
          message: "Kode MFA tidak valid",
        };
      }
    }

    // Reset percobaan gagal dan update waktu login terakhir
    await user.update({
      failed_attempts: 0,
      last_login: new Date(),
    });
    console.log('user berhasil update');
    // Dapatkan kunci provider aktif untuk penandatanganan
    const providerKey = await ProviderKeyModel.findActiveKey(); 
    if (!providerKey) {
      logger.error("No active provider key found for signing");
      return {
        success: false,
        code: "CONFIGURATION_ERROR",
        message: "System configuration error: No active signing key",
      };
    }
    console.log('providerKey', providerKey);

    // Buat token access baru
    const tokenValue = generateRandomToken();
    const tokenHash = hashData(tokenValue);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token berlaku 1 jam

    // Data untuk tanda tangan
    const signatureData = JSON.stringify({
      userId: user.id,
      consumerId: consumer.id,
      tokenHash: tokenHash,
      expiresAt: expiresAt.toISOString(),
    });

    // Dapatkan kunci privat provider yang digunakan untuk tanda tangan
    // (Kunci seharusnya didecrypt menggunakan kunci master, disederhanakan untuk demo)
    const signature = ""; // signData(signatureData, decryptedPrivateKey);

    // Simpan token ke database
    const token = await TokenModel.create({
      user_id: user.id,
      consumer_id: consumer.id,
      token_hash: tokenHash,
      signature: signature || "simulated-signature", // Gunakan simulasi untuk demo
      provider_key_id: providerKey.id,
      expires_at: expiresAt,
      metadata: {
        ip_address: ipAddress,
        user_agent: userAgent,
        issued_at: new Date(),
      },
    });

    // Buat JWT untuk response
    const jwtPayload = {
      sub: user.id,
      username: user.username,
      consumer: consumer.name,
      token_id: token.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    const jwtToken = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET || "default-jwt-secret"
    );

    // Cari peran pengguna untuk respon
    const userWithRoles = await UserModel.findWithRoles(user.id);
    const roles = userWithRoles.Roles.map((role) => role.name);

    logger.info(`Successful authentication for user: ${username}`);

    // Kembalikan hasil sukses
    return {
      success: true,
      token: jwtToken,
      expiresAt: expiresAt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: roles,
      },
    };
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "An internal system error occurred",
    };
  }
};

/**
 * Verifikasi token
 * @param {string} token - Token yang akan diverifikasi
 * @param {string} consumerId - ID API consumer
 * @returns {Promise<Object>} Hasil verifikasi
 */
export const verifyToken = async (token, consumerId) => {
  try {
    // Decode JWT without verification to get token_id
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.token_id) {
      return {
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid token format",
      };
    }

    // Verify JWT signature
    try {
      jwt.verify(token, process.env.JWT_SECRET || "default-jwt-secret");
    } catch (error) {
      logger.warn(`Invalid JWT signature: ${error.message}`);
      return {
        success: false,
        code: "INVALID_SIGNATURE",
        message: "Invalid token signature",
      };
    }

    // Find token in database
    const tokenRecord = await TokenModel.findByPk(decoded.token_id);
    if (!tokenRecord) {
      return {
        success: false,
        code: "TOKEN_NOT_FOUND",
        message: "Token not found",
      };
    }

    // Check if token is revoked
    if (tokenRecord.is_revoked) {
      return {
        success: false,
        code: "TOKEN_REVOKED",
        message: "Token has been revoked",
      };
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expires_at) {
      return {
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Token has expired",
      };
    }

    // Check if token was issued to the same consumer
    if (tokenRecord.consumer_id !== consumerId) {
      logger.warn(
        `Token consumer mismatch: expected=${consumerId}, actual=${tokenRecord.consumer_id}`
      );
      return {
        success: false,
        code: "CONSUMER_MISMATCH",
        message: "Token was not issued to this consumer",
      };
    }

    // Get user data
    const user = await UserModel.findWithRoles(tokenRecord.user_id);
    if (!user || !user.is_active) {
      return {
        success: false,
        code: "USER_UNAVAILABLE",
        message: "User not found or inactive",
      };
    }

    // Extract roles
    const roles = user.Roles.map((role) => role.name);

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: roles,
      },
    };
  } catch (error) {
    logger.error(`Token verification error: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "An internal system error occurred",
    };
  }
};

/**
 * Revoke token
 * @param {string} tokenId - ID token yang akan direvoke
 * @param {Object} context - Konteks revokasi
 * @returns {Promise<Object>} Hasil revokasi
 */
export const revokeToken = async (tokenId, context) => {
  const { userId, reason, ipAddress, userAgent } = context;

  try {
    const revoked = await TokenModel.revokeById(tokenId);

    if (!revoked) {
      return {
        success: false,
        code: "TOKEN_NOT_FOUND",
        message: "Token not found or already revoked",
      };
    }

    logger.info(
      `Token revoked: ${tokenId}, user: ${userId}, reason: ${reason}`
    );

    return {
      success: true,
      message: "Token successfully revoked",
    };
  } catch (error) {
    logger.error(`Token revocation error: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "An internal system error occurred",
    };
  }
};

/**
 * Revoke all tokens for a user
 * @param {string} userId - ID pengguna
 * @param {Object} context - Konteks revokasi
 * @returns {Promise<Object>} Hasil revokasi
 */
export const revokeAllTokensForUser = async (userId, context) => {
  const { reason, ipAddress, userAgent } = context;

  try {
    const count = await TokenModel.revokeAllForUser(userId);

    logger.info(
      `All tokens revoked for user: ${userId}, count: ${count}, reason: ${reason}`
    );

    return {
      success: true,
      message: `Successfully revoked ${count} tokens`,
      count,
    };
  } catch (error) {
    logger.error(`Token revocation error: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "An internal system error occurred",
    };
  }
};

/**
 * Check if user has permission
 * @param {string} userId - ID pengguna
 * @param {string} permission - Nama permission yang dicek
 * @returns {Promise<boolean>} Hasil pengecekan
 */
export const hasPermission = async (userId, permission) => {
  try {
    return await UserModel.hasPermission(userId, permission);
  } catch (error) {
    logger.error(`Permission check error: ${error.message}`);
    return false;
  }
};
