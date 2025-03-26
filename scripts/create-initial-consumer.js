// Simpan sebagai scripts/create-initial-consumer.js
import { sequelize, ConsumerModel } from '../src/models/index.model.js';
import { generateRandomToken, hashData } from '../src/services/crypto.service.js';
import { generateRsaKeyPair } from '../src/services/crypto.service.js';
import dotenv from 'dotenv';

dotenv.config();

const createInitialConsumer = async () => {
  try {
    // Generate key pair
    const { publicKey, privateKey } = generateRsaKeyPair(2048);
    
    // Generate API key
    const apiKey = generateRandomToken(32);
    const apiKeySalt = generateRandomToken(8);
    const apiKeyHash = hashData(apiKey + apiKeySalt);
    
    const consumer = await ConsumerModel.create({
      name: 'TestConsumer',
      api_key_hash: apiKeyHash,
      api_key_salt: apiKeySalt,
      public_key: publicKey,
      key_algorithm: 'RSA-2048',
      key_version: 1,
      allowed_ips: [],
      is_active: true
    });
    
    console.log('Initial API consumer created successfully:');
    console.log('Consumer ID:', consumer.id);
    console.log('Consumer Name:', consumer.name);
    console.log('API Key (simpan ini!):', apiKey);
    console.log('Private Key (simpan ini untuk pengujian signature):', privateKey);
    
    // Close connection
    await sequelize.close();
  } catch (error) {
    console.error('Error creating initial consumer:', error);
  }
};

createInitialConsumer();