/**
 * Service untuk manajemen Multi-Factor Authentication
 *
 * Modul ini menyediakan fungsi-fungsi untuk mengelola otentikasi multi-faktor (MFA)
 * menggunakan Time-based One-Time Password (TOTP) standar.
 *
 * @module mfa.service
 */
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { UserModel } from "../models/index.model.js";
import { verifyPassword } from "./crypto.service.js";
import { logger } from "../utils/logger.util.js";
import { sendSMS } from "../services/notification.service.js"; // Implementasikan service ini
import { sendEmail } from "../services/notification.service.js"; // Implementasikan service ini

/**
 * Setup TOTP untuk user
 * Fungsi ini membuat konfigurasi TOTP baru untuk pengguna meliputi
 * pembuatan secret key dan QR code untuk dipindai dengan aplikasi autentikator.
 *
 * @param {string} userId - ID user
 * @returns {Promise<Object>} Setup result dengan format:
 *  {
 *    success: boolean, - Indikator keberhasilan operasi
 *    data: {
 *      secret: string, - Secret key dalam format base32
 *      qrCodeUrl: string - URL data untuk QR code (format data:image/png;base64,...)
 *    },
 *    code: string, - Kode error (jika gagal)
 *    message: string - Pesan error (jika gagal)
 *  }
 */
export const setupTOTP = async (userId) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah user sudah setup MFA
    const mfaSettings = user.mfa_settings || {};
    if (mfaSettings.enabled) {
      return {
        success: false,
        code: "MFA_ALREADY_ENABLED",
        message: "MFA sudah diaktifkan untuk user ini",
      };
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `CentralizedAuth:${user.username}`,
      issuer: "Centralized Auth System",
    });

    // Simpan secret ke mfa_settings user (belum verified)
    mfaSettings.totp = {
      secret: secret.base32, // Simpan dalam format base32
      verified: false,
      backup_codes: [],
      setup_at: new Date().toISOString(),
    };

    await user.update({ mfa_settings: mfaSettings });

    // Generate QR code URL
    const otpauthUrl = secret.otpauth_url;
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    logger.info(`TOTP setup initiated for user: ${user.username}`);

    return {
      success: true,
      data: {
        secret: secret.base32,
        qrCodeUrl,
        appName: "Centralized Auth System",
      },
    };
  } catch (error) {
    logger.error(`Error setting up TOTP: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat setup TOTP",
    };
  }
};

/**
 * Verifikasi dan aktifkan TOTP setup
 * Fungsi ini memverifikasi token TOTP yang dimasukkan oleh pengguna
 * dan jika valid, mengaktifkan MFA untuk akun tersebut serta
 * menghasilkan backup codes untuk digunakan jika pengguna kehilangan akses ke device autentikator.
 *
 * @param {string} userId - ID user
 * @param {string} token - TOTP token untuk verifikasi
 * @returns {Promise<Object>} Hasil verifikasi dengan format:
 *  {
 *    success: boolean, - Indikator keberhasilan operasi
 *    data: {
 *      backupCodes: string[] - Array berisi 10 backup codes
 *    },
 *    code: string, - Kode error (jika gagal)
 *    message: string - Pesan error (jika gagal)
 *  }
 */
export const verifyAndEnableTOTP = async (userId, token) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah user sudah setup TOTP
    const mfaSettings = user.mfa_settings || {};
    if (!mfaSettings.totp || !mfaSettings.totp.secret) {
      return {
        success: false,
        code: "TOTP_NOT_SETUP",
        message: "TOTP belum di-setup, silakan setup terlebih dahulu",
      };
    }

    // Cek apakah TOTP sudah diverifikasi
    if (mfaSettings.totp.verified && mfaSettings.enabled) {
      return {
        success: false,
        code: "TOTP_ALREADY_VERIFIED",
        message: "TOTP sudah diverifikasi sebelumnya",
      };
    }

    // Verifikasi token
    const verified = speakeasy.totp.verify({
      secret: mfaSettings.totp.secret,
      encoding: "base32",
      token: token,
      window: 1, // Allow 1 step before/after for time drift (30 detik)
    });

    if (!verified) {
      logger.warn(
        `Failed TOTP verification attempt for user: ${user.username}`
      );
      return {
        success: false,
        code: "INVALID_TOKEN",
        message: "Token TOTP tidak valid atau kedaluwarsa",
      };
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(generateBackupCode());
    }

    // Update mfa_settings
    mfaSettings.enabled = true;
    mfaSettings.preferred_method = "totp";
    mfaSettings.totp.verified = true;
    mfaSettings.totp.backup_codes = backupCodes;
    mfaSettings.totp.verified_at = new Date().toISOString();

    await user.update({ mfa_settings: mfaSettings });

    logger.info(`TOTP enabled for user: ${user.username}`);

    return {
      success: true,
      data: {
        backupCodes,
        message: "TOTP berhasil diaktifkan. Simpan backup codes dengan aman.",
      },
    };
  } catch (error) {
    logger.error(`Error verifying TOTP: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat verifikasi TOTP",
    };
  }
};

/**
 * Verifikasi TOTP token
 * Fungsi ini memverifikasi token TOTP yang dimasukkan oleh pengguna
 * dan juga memeriksa apakah token yang dimasukkan adalah backup code.
 *
 * @param {string} userId - ID user
 * @param {string} token - TOTP token untuk verifikasi
 * @returns {Promise<Object>} Hasil verifikasi dengan format:
 *  {
 *    success: boolean, - Indikator keberhasilan operasi
 *    usedBackupCode: boolean, - Indikator apakah token adalah backup code
 *    code: string, - Kode error (jika gagal)
 *    message: string - Pesan error (jika gagal)
 *  }
 */
export const verifyTOTP = async (userId, token) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah MFA diaktifkan
    const mfaSettings = user.mfa_settings || {};
    if (
      !mfaSettings.enabled ||
      !mfaSettings.totp ||
      !mfaSettings.totp.verified
    ) {
      return {
        success: false,
        code: "TOTP_NOT_ENABLED",
        message: "TOTP tidak diaktifkan untuk user ini",
      };
    }

    // Cek apakah token adalah backup code
    if (
      mfaSettings.totp.backup_codes &&
      mfaSettings.totp.backup_codes.includes(token)
    ) {
      // Hapus backup code yang sudah digunakan
      mfaSettings.totp.backup_codes = mfaSettings.totp.backup_codes.filter(
        (code) => code !== token
      );
      await user.update({ mfa_settings: mfaSettings });

      logger.info(`Backup code used for user: ${user.username}`);
      return {
        success: true,
        usedBackupCode: true,
        message: "Backup code valid dan telah digunakan",
      };
    }

    // Verifikasi token TOTP
    const verified = speakeasy.totp.verify({
      secret: mfaSettings.totp.secret,
      encoding: "base32",
      token: token,
      window: 1, // Allow 1 step before/after for time drift
    });

    if (!verified) {
      logger.warn(
        `Failed TOTP authentication attempt for user: ${user.username}`
      );
      return {
        success: false,
        code: "INVALID_TOKEN",
        message: "Token TOTP tidak valid atau kedaluwarsa",
      };
    }

    // Log successful verification
    logger.info(`Successful TOTP verification for user: ${user.username}`);

    return {
      success: true,
      message: "Token TOTP valid",
    };
  } catch (error) {
    logger.error(`Error verifying TOTP: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat verifikasi TOTP",
    };
  }
};

/**
 * Disable MFA untuk user
 * Fungsi ini menonaktifkan MFA untuk akun pengguna
 * setelah memverifikasi password untuk keamanan.
 *
 * @param {string} userId - ID user
 * @param {string} currentPassword - Password user untuk verifikasi keamanan
 * @returns {Promise<Object>} Hasil operasi dengan format:
 *  {
 *    success: boolean, - Indikator keberhasilan operasi
 *    message: string, - Pesan sukses (jika berhasil)
 *    code: string, - Kode error (jika gagal)
 *    message: string - Pesan error (jika gagal)
 *  }
 */
export const disableMFA = async (userId, currentPassword) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah MFA diaktifkan
    const mfaSettings = user.mfa_settings || {};
    if (!mfaSettings.enabled) {
      return {
        success: false,
        code: "MFA_NOT_ENABLED",
        message: "MFA tidak diaktifkan untuk user ini",
      };
    }

    // Verifikasi password
    const isPasswordValid = await verifyPassword(
      currentPassword,
      user.password_hash
    );
    if (!isPasswordValid) {
      logger.warn(
        `Failed MFA disable attempt (invalid password) for user: ${user.username}`
      );
      return {
        success: false,
        code: "INVALID_PASSWORD",
        message: "Password tidak valid",
      };
    }

    // Reset mfa_settings
    const resetSettings = {
      enabled: false,
      preferred_method: null,
      disabled_at: new Date().toISOString(),
      previous_settings: {
        method: mfaSettings.preferred_method,
        disabled_at: new Date().toISOString(),
      },
    };

    await user.update({ mfa_settings: resetSettings });

    logger.info(`MFA disabled for user: ${user.username}`);

    return {
      success: true,
      message: "MFA berhasil dinonaktifkan",
    };
  } catch (error) {
    logger.error(`Error disabling MFA: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat menonaktifkan MFA",
    };
  }
};

/**
 * Mendapatkan status MFA untuk user
 *
 * @param {string} userId - ID user
 * @returns {Promise<Object>} Status MFA dengan format:
 *  {
 *    success: boolean, - Indikator keberhasilan operasi
 *    data: {
 *      enabled: boolean, - Status MFA (enabled/disabled)
 *      method: string, - Metode MFA yang digunakan (e.g., 'totp')
 *      setup_at: string, - Waktu setup (ISO string)
 *      verified_at: string - Waktu verifikasi (ISO string)
 *    },
 *    code: string, - Kode error (jika gagal)
 *    message: string - Pesan error (jika gagal)
 *  }
 */
export const getMFAStatus = async (userId) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Dapatkan status MFA
    const mfaSettings = user.mfa_settings || {};
    const isEnabled = !!mfaSettings.enabled;

    return {
      success: true,
      data: {
        enabled: isEnabled,
        method: mfaSettings.preferred_method || null,
        setup_at: mfaSettings.totp?.setup_at || null,
        verified_at: mfaSettings.totp?.verified_at || null,
      },
    };
  } catch (error) {
    logger.error(`Error getting MFA status: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat mendapatkan status MFA",
    };
  }
};

/**
 * Regenerate backup codes untuk user
 *
 * @param {string} userId - ID user
 * @param {string} currentPassword - Password user untuk verifikasi keamanan
 * @returns {Promise<Object>} Hasil operasi dengan format:
 *  {
 *    success: boolean, - Indikator keberhasilan operasi
 *    data: {
 *      backupCodes: string[] - Array berisi 10 backup codes baru
 *    },
 *    code: string, - Kode error (jika gagal)
 *    message: string - Pesan error (jika gagal)
 *  }
 */
export const regenerateBackupCodes = async (userId, currentPassword) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah MFA diaktifkan
    const mfaSettings = user.mfa_settings || {};
    if (
      !mfaSettings.enabled ||
      !mfaSettings.totp ||
      !mfaSettings.totp.verified
    ) {
      return {
        success: false,
        code: "TOTP_NOT_ENABLED",
        message: "TOTP tidak diaktifkan untuk user ini",
      };
    }

    // Verifikasi password
    const isPasswordValid = await verifyPassword(
      currentPassword,
      user.password_hash
    );
    if (!isPasswordValid) {
      return {
        success: false,
        code: "INVALID_PASSWORD",
        message: "Password tidak valid",
      };
    }

    // Generate backup codes baru
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(generateBackupCode());
    }

    // Update backup codes
    mfaSettings.totp.backup_codes = backupCodes;
    mfaSettings.totp.backup_codes_regenerated_at = new Date().toISOString();

    await user.update({ mfa_settings: mfaSettings });

    logger.info(`Backup codes regenerated for user: ${user.username}`);

    return {
      success: true,
      data: {
        backupCodes,
      },
      message: "Backup codes berhasil digenerate ulang",
    };
  } catch (error) {
    logger.error(`Error regenerating backup codes: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat mengenerate ulang backup codes",
    };
  }
};

/**
 * Generate backup code
 * Fungsi internal untuk membuat backup code dengan format XXXXX-XXXXX,
 * yang dapat digunakan jika pengguna kehilangan akses ke device autentikator.
 *
 * @private
 * @returns {string} Backup code dalam format XXXXX-XXXXX
 */
function generateBackupCode() {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 10; i++) {
    if (i === 5) code += "-";
    else code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Setup SMS MFA untuk user
 * @param {string} userId - ID user
 * @param {string} phoneNumber - Nomor telepon
 * @returns {Promise<Object>} Setup result
 */
export const setupSMSMFA = async (userId, phoneNumber) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Validasi format nomor telepon (bisa gunakan library seperti libphonenumber-js)
    if (!isValidPhoneNumber(phoneNumber)) {
      return {
        success: false,
        code: "INVALID_PHONE_NUMBER",
        message: "Format nomor telepon tidak valid",
      };
    }

    // Cek apakah user sudah setup MFA
    const mfaSettings = user.mfa_settings || {};
    if (mfaSettings.enabled) {
      return {
        success: false,
        code: "MFA_ALREADY_ENABLED",
        message: "MFA sudah diaktifkan untuk user ini",
      };
    }

    // Generate OTP verification code
    const verificationCode = generateNumericCode(6);

    // Simpan data ke mfa_settings user (belum verified)
    mfaSettings.sms = {
      phone_number: phoneNumber,
      verified: false,
      verification_code: verificationCode,
      verification_code_expires_at: new Date(
        Date.now() + 10 * 60 * 1000
      ).toISOString(), // 10 menit
      setup_at: new Date().toISOString(),
    };

    await user.update({ mfa_settings: mfaSettings });

    // Kirim kode verifikasi SMS
    await sendSMS(
      phoneNumber,
      `Kode verifikasi MFA Anda adalah: ${verificationCode}. Kode berlaku selama 10 menit.`
    );

    logger.info(`SMS MFA setup initiated for user: ${user.username}`);

    return {
      success: true,
      message: "Kode verifikasi telah dikirim ke nomor telepon Anda",
    };
  } catch (error) {
    logger.error(`Error setting up SMS MFA: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat setup SMS MFA",
    };
  }
};

/**
 * Verifikasi dan aktifkan SMS MFA
 * @param {string} userId - ID user
 * @param {string} verificationCode - Kode verifikasi yang dikirim via SMS
 * @returns {Promise<Object>} Hasil verifikasi
 */
export const verifyAndEnableSMSMFA = async (userId, verificationCode) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah user sudah setup SMS MFA
    const mfaSettings = user.mfa_settings || {};
    if (!mfaSettings.sms || !mfaSettings.sms.verification_code) {
      return {
        success: false,
        code: "SMS_MFA_NOT_SETUP",
        message: "SMS MFA belum di-setup",
      };
    }

    // Cek apakah kode sudah kedaluwarsa
    const expiresAt = new Date(mfaSettings.sms.verification_code_expires_at);
    if (Date.now() > expiresAt) {
      return {
        success: false,
        code: "VERIFICATION_CODE_EXPIRED",
        message: "Kode verifikasi sudah kedaluwarsa",
      };
    }

    // Verifikasi kode
    if (verificationCode !== mfaSettings.sms.verification_code) {
      return {
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        message: "Kode verifikasi tidak valid",
      };
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(generateBackupCode());
    }

    // Update mfa_settings
    mfaSettings.enabled = true;
    mfaSettings.preferred_method = "sms";
    mfaSettings.sms.verified = true;
    mfaSettings.sms.backup_codes = backupCodes;
    mfaSettings.sms.verified_at = new Date().toISOString();

    // Hapus kode verifikasi untuk keamanan
    delete mfaSettings.sms.verification_code;
    delete mfaSettings.sms.verification_code_expires_at;

    await user.update({ mfa_settings: mfaSettings });

    logger.info(`SMS MFA enabled for user: ${user.username}`);

    return {
      success: true,
      data: {
        backupCodes,
      },
      message: "SMS MFA berhasil diaktifkan",
    };
  } catch (error) {
    logger.error(`Error verifying SMS MFA: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat verifikasi SMS MFA",
    };
  }
};

/**
 * Generate dan kirim OTP SMS
 * @param {string} userId - ID user
 * @returns {Promise<Object>} Hasil operasi
 */
export const generateAndSendSMSOTP = async (userId) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah SMS MFA diaktifkan
    const mfaSettings = user.mfa_settings || {};
    if (
      !mfaSettings.enabled ||
      mfaSettings.preferred_method !== "sms" ||
      !mfaSettings.sms.verified
    ) {
      return {
        success: false,
        code: "SMS_MFA_NOT_ENABLED",
        message: "SMS MFA tidak diaktifkan untuk user ini",
      };
    }

    // Generate OTP code
    const otpCode = generateNumericCode(6);

    // Simpan OTP ke database
    mfaSettings.sms.current_otp = otpCode;
    mfaSettings.sms.otp_expires_at = new Date(
      Date.now() + 5 * 60 * 1000
    ).toISOString(); // 5 menit

    await user.update({ mfa_settings: mfaSettings });

    // Kirim OTP via SMS
    await sendSMS(
      mfaSettings.sms.phone_number,
      `Kode OTP untuk login Anda adalah: ${otpCode}. Kode berlaku selama 5 menit.`
    );

    logger.info(`SMS OTP sent for user: ${user.username}`);

    return {
      success: true,
      message: "Kode OTP telah dikirim ke nomor telepon Anda",
    };
  } catch (error) {
    logger.error(`Error generating SMS OTP: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat mengirim SMS OTP",
    };
  }
};

/**
 * Verifikasi SMS OTP
 * @param {string} userId - ID user
 * @param {string} otpCode - OTP code dari SMS
 * @returns {Promise<Object>} Hasil verifikasi
 */
export const verifySMSOTP = async (userId, otpCode) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah SMS MFA diaktifkan
    const mfaSettings = user.mfa_settings || {};
    if (
      !mfaSettings.enabled ||
      mfaSettings.preferred_method !== "sms" ||
      !mfaSettings.sms.verified
    ) {
      return {
        success: false,
        code: "SMS_MFA_NOT_ENABLED",
        message: "SMS MFA tidak diaktifkan untuk user ini",
      };
    }

    // Cek apakah OTP tersedia
    if (!mfaSettings.sms.current_otp || !mfaSettings.sms.otp_expires_at) {
      return {
        success: false,
        code: "OTP_NOT_REQUESTED",
        message: "OTP belum diminta atau sudah digunakan",
      };
    }

    // Cek apakah OTP sudah kedaluwarsa
    const expiresAt = new Date(mfaSettings.sms.otp_expires_at);
    if (Date.now() > expiresAt) {
      // Hapus OTP kedaluwarsa
      delete mfaSettings.sms.current_otp;
      delete mfaSettings.sms.otp_expires_at;
      await user.update({ mfa_settings: mfaSettings });

      return {
        success: false,
        code: "OTP_EXPIRED",
        message: "OTP sudah kedaluwarsa",
      };
    }

    // Verifikasi OTP
    if (otpCode !== mfaSettings.sms.current_otp) {
      return {
        success: false,
        code: "INVALID_OTP",
        message: "OTP tidak valid",
      };
    }

    // Hapus OTP setelah digunakan
    delete mfaSettings.sms.current_otp;
    delete mfaSettings.sms.otp_expires_at;
    await user.update({ mfa_settings: mfaSettings });

    logger.info(`Successful SMS OTP verification for user: ${user.username}`);

    return {
      success: true,
      message: "OTP valid",
    };
  } catch (error) {
    logger.error(`Error verifying SMS OTP: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat verifikasi OTP",
    };
  }
};

/**
 * Setup Email MFA untuk user
 * @param {string} userId - ID user
 * @param {string} email - Alamat email (opsional, jika tidak diberikan akan menggunakan email user)
 * @returns {Promise<Object>} Setup result
 */
export const setupEmailMFA = async (userId, email = null) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Gunakan email dari parameter atau dari profil user
    const targetEmail = email || user.email;

    // Validasi email
    if (!targetEmail || !isValidEmail(targetEmail)) {
      return {
        success: false,
        code: "INVALID_EMAIL",
        message: "Alamat email tidak valid",
      };
    }

    // Cek apakah user sudah setup MFA
    const mfaSettings = user.mfa_settings || {};
    if (mfaSettings.enabled) {
      return {
        success: false,
        code: "MFA_ALREADY_ENABLED",
        message: "MFA sudah diaktifkan untuk user ini",
      };
    }

    // Generate verification code
    const verificationCode = generateNumericCode(6);

    // Simpan data ke mfa_settings user (belum verified)
    mfaSettings.email = {
      address: targetEmail,
      verified: false,
      verification_code: verificationCode,
      verification_code_expires_at: new Date(
        Date.now() + 30 * 60 * 1000
      ).toISOString(), // 30 menit
      setup_at: new Date().toISOString(),
    };

    await user.update({ mfa_settings: mfaSettings });

    // Kirim kode verifikasi email
    await sendEmail({
      to: targetEmail,
      subject: "Verifikasi MFA",
      text: `Kode verifikasi MFA Anda adalah: ${verificationCode}. Kode berlaku selama 30 menit.`,
      html: `<h1>Verifikasi MFA</h1>
             <p>Kode verifikasi MFA Anda adalah: <strong>${verificationCode}</strong></p>
             <p>Kode berlaku selama 30 menit.</p>`,
    });

    logger.info(`Email MFA setup initiated for user: ${user.username}`);

    return {
      success: true,
      message: "Kode verifikasi telah dikirim ke alamat email Anda",
    };
  } catch (error) {
    logger.error(`Error setting up Email MFA: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat setup Email MFA",
    };
  }
};

/**
 * Verifikasi dan aktifkan Email MFA
 * @param {string} userId - ID user
 * @param {string} verificationCode - Kode verifikasi yang dikirim via Email
 * @returns {Promise<Object>} Hasil verifikasi
 */
export const verifyAndEnableEmailMFA = async (userId, verificationCode) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah user sudah setup Email MFA
    const mfaSettings = user.mfa_settings || {};
    if (!mfaSettings.email || !mfaSettings.email.verification_code) {
      return {
        success: false,
        code: "EMAIL_MFA_NOT_SETUP",
        message: "Email MFA belum di-setup",
      };
    }

    // Cek apakah kode sudah kedaluwarsa
    const expiresAt = new Date(mfaSettings.email.verification_code_expires_at);
    if (Date.now() > expiresAt) {
      return {
        success: false,
        code: "VERIFICATION_CODE_EXPIRED",
        message: "Kode verifikasi sudah kedaluwarsa",
      };
    }

    // Verifikasi kode
    if (verificationCode !== mfaSettings.email.verification_code) {
      return {
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        message: "Kode verifikasi tidak valid",
      };
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(generateBackupCode());
    }

    // Update mfa_settings
    mfaSettings.enabled = true;
    mfaSettings.preferred_method = "email";
    mfaSettings.email.verified = true;
    mfaSettings.email.backup_codes = backupCodes;
    mfaSettings.email.verified_at = new Date().toISOString();

    // Hapus kode verifikasi untuk keamanan
    delete mfaSettings.email.verification_code;
    delete mfaSettings.email.verification_code_expires_at;

    await user.update({ mfa_settings: mfaSettings });

    logger.info(`Email MFA enabled for user: ${user.username}`);

    return {
      success: true,
      data: {
        backupCodes,
      },
      message: "Email MFA berhasil diaktifkan",
    };
  } catch (error) {
    logger.error(`Error verifying Email MFA: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat verifikasi Email MFA",
    };
  }
};

/**
 * Generate dan kirim OTP Email
 * @param {string} userId - ID user
 * @returns {Promise<Object>} Hasil operasi
 */
export const generateAndSendEmailOTP = async (userId) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah Email MFA diaktifkan
    const mfaSettings = user.mfa_settings || {};
    if (
      !mfaSettings.enabled ||
      mfaSettings.preferred_method !== "email" ||
      !mfaSettings.email.verified
    ) {
      return {
        success: false,
        code: "EMAIL_MFA_NOT_ENABLED",
        message: "Email MFA tidak diaktifkan untuk user ini",
      };
    }

    // Generate OTP code
    const otpCode = generateNumericCode(6);

    // Simpan OTP ke database
    mfaSettings.email.current_otp = otpCode;
    mfaSettings.email.otp_expires_at = new Date(
      Date.now() + 15 * 60 * 1000
    ).toISOString(); // 15 menit

    await user.update({ mfa_settings: mfaSettings });

    // Kirim OTP via Email
    await sendEmail({
      to: mfaSettings.email.address,
      subject: "Kode OTP Login",
      text: `Kode OTP untuk login Anda adalah: ${otpCode}. Kode berlaku selama 15 menit.`,
      html: `<h1>Kode OTP Login</h1>
             <p>Kode OTP untuk login Anda adalah: <strong>${otpCode}</strong></p>
             <p>Kode berlaku selama 15 menit.</p>`,
    });

    logger.info(`Email OTP sent for user: ${user.username}`);

    return {
      success: true,
      message: "Kode OTP telah dikirim ke alamat email Anda",
    };
  } catch (error) {
    logger.error(`Error generating Email OTP: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat mengirim Email OTP",
    };
  }
};

/**
 * Verifikasi Email OTP
 * @param {string} userId - ID user
 * @param {string} otpCode - OTP code dari Email
 * @returns {Promise<Object>} Hasil verifikasi
 */
export const verifyEmailOTP = async (userId, otpCode) => {
  try {
    // Cari user
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        message: "User tidak ditemukan",
      };
    }

    // Cek apakah Email MFA diaktifkan
    const mfaSettings = user.mfa_settings || {};
    if (
      !mfaSettings.enabled ||
      mfaSettings.preferred_method !== "email" ||
      !mfaSettings.email.verified
    ) {
      return {
        success: false,
        code: "EMAIL_MFA_NOT_ENABLED",
        message: "Email MFA tidak diaktifkan untuk user ini",
      };
    }

    // Cek apakah OTP tersedia
    if (!mfaSettings.email.current_otp || !mfaSettings.email.otp_expires_at) {
      return {
        success: false,
        code: "OTP_NOT_REQUESTED",
        message: "OTP belum diminta atau sudah digunakan",
      };
    }

    // Cek apakah OTP sudah kedaluwarsa
    const expiresAt = new Date(mfaSettings.email.otp_expires_at);
    if (Date.now() > expiresAt) {
      // Hapus OTP kedaluwarsa
      delete mfaSettings.email.current_otp;
      delete mfaSettings.email.otp_expires_at;
      await user.update({ mfa_settings: mfaSettings });

      return {
        success: false,
        code: "OTP_EXPIRED",
        message: "OTP sudah kedaluwarsa",
      };
    }

    // Verifikasi OTP
    if (otpCode !== mfaSettings.email.current_otp) {
      return {
        success: false,
        code: "INVALID_OTP",
        message: "OTP tidak valid",
      };
    }

    // Hapus OTP setelah digunakan
    delete mfaSettings.email.current_otp;
    delete mfaSettings.email.otp_expires_at;
    await user.update({ mfa_settings: mfaSettings });

    logger.info(`Successful Email OTP verification for user: ${user.username}`);

    return {
      success: true,
      message: "OTP valid",
    };
  } catch (error) {
    logger.error(`Error verifying Email OTP: ${error.message}`);
    return {
      success: false,
      code: "SYSTEM_ERROR",
      message: "Terjadi kesalahan saat verifikasi OTP",
    };
  }
};

/**
 * Fungsi helper untuk memvalidasi format nomor telepon
 * @param {string} phoneNumber - Nomor telepon
 * @returns {boolean} True jika valid
 */
function isValidPhoneNumber(phoneNumber) {
  // Contoh sederhana, idealnya gunakan library libphonenumber-js
  return /^\+?[0-9]{10,15}$/.test(phoneNumber);
}

/**
 * Fungsi helper untuk memvalidasi format email
 * @param {string} email - Alamat email
 * @returns {boolean} True jika valid
 */
function isValidEmail(email) {
  // Validasi format email sederhana
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Fungsi helper untuk menghasilkan kode numerik acak
 * @param {number} length - Panjang kode
 * @returns {string} Kode numerik
 */
function generateNumericCode(length) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}
