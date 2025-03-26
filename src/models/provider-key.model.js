/**
 * Model Provider Key untuk aplikasi otentikasi terpusat
 */
import { DataTypes } from "sequelize";

/**
 * Inisialisasi model ProviderKey
 * @param {Sequelize} sequelize - Instance Sequelize
 * @returns {Model} Model ProviderKey yang telah diinisialisasi
 */
export const initProviderKeyModel = (sequelize) => {
  const ProviderKey = sequelize.define(
    "ProviderKey",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        comment: "UUID provider key sebagai primary key",
      },
      public_key: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Kunci publik provider untuk verifikasi oleh consumer",
      },
      private_key_encrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Kunci privat provider (terenkripsi)",
      },
      key_algorithm: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: "Algoritma kunci (RSA, ECDSA, Ed25519)",
      },
      key_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Versi kunci untuk rotasi kunci",
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "active",
        validate: {
          isIn: [["active", "inactive", "revoked"]],
        },
        comment: "Status kunci (active, inactive, revoked)",
      },
      valid_from: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Kunci valid mulai tanggal ini",
      },
      valid_until: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Kunci valid sampai tanggal ini",
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "User yang membuat kunci ini",
      },
    },
    {
      tableName: "provider_keys",
      schema: sequelize.options.searchPath[0], // menggunakan schema yang dikonfigurasi
      timestamps: false, // enables createdAt and updatedAt
      underscored: true, // use snake_case for fields
    }
  );

  /**
   * Mendapatkan kunci aktif saat ini
   * @returns {Promise<Object>} Kunci aktif yang ditemukan
   */
  ProviderKey.findActiveKey = async function () {
    // PERBAIKAN SEMENTARA
    console.log("Finding active key with simplified query for testing");
    return await this.findOne({
      where: {
        status: "active",
      },
      order: [["key_version", "DESC"]],
    });

    // Kode asli di bawah ini dikomentari sementara
    /*
    const now = new Date();
    
    return await this.findOne({
      where: {
        status: 'active',
        valid_from: { [sequelize.Op.lte]: now },
        valid_until: {
          [sequelize.Op.or]: [
            { [sequelize.Op.gt]: now },
            { [sequelize.Op.is]: null }
          ]
        }
      },
      order: [['key_version', 'DESC']]
    });
    */
  };

  /**
   * Menonaktifkan kunci lama dan menambahkan kunci baru
   * @param {string} publicKey - Kunci publik baru
   * @param {string} privateKeyEncrypted - Kunci privat terenkripsi
   * @param {string} keyAlgorithm - Algoritma kunci
   * @param {string} createdBy - ID user yang melakukan rotasi
   * @returns {Promise<Object>} Kunci baru yang ditambahkan
   */
  ProviderKey.rotateKey = async function (
    publicKey,
    privateKeyEncrypted,
    keyAlgorithm,
    createdBy
  ) {
    const transaction = await sequelize.transaction();

    try {
      // Mendapatkan versi kunci tertinggi
      const maxVersionResult = await this.max("key_version", { transaction });
      const newVersion = (maxVersionResult || 0) + 1;

      // Nonaktifkan semua kunci aktif
      await this.update(
        {
          status: "inactive",
          updated_at: new Date(),
        },
        {
          where: { status: "active" },
          transaction,
        }
      );

      // Buat kunci baru
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 90); // Valid selama 90 hari

      const newKey = await this.create(
        {
          public_key: publicKey,
          private_key_encrypted: privateKeyEncrypted,
          key_algorithm: keyAlgorithm,
          key_version: newVersion,
          status: "active",
          valid_from: validFrom,
          valid_until: validUntil,
          created_by: createdBy,
        },
        { transaction }
      );

      await transaction.commit();
      return newKey;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  /**
   * Mencabut kunci tertentu
   * @param {string} keyId - ID kunci yang akan dicabut
   * @param {string} updatedBy - ID user yang melakukan pencabutan
   * @returns {Promise<boolean>} Hasil operasi
   */
  ProviderKey.revokeKey = async function (keyId, updatedBy) {
    const key = await this.findByPk(keyId);

    if (!key) {
      throw new Error("Key not found");
    }

    await key.update({
      status: "revoked",
      updated_at: new Date(),
      updated_by: updatedBy,
    });

    return true;
  };

  return ProviderKey;
};
