// scripts/regenerate-consumer-api-key.js
import { sequelize, ConsumerModel } from '../src/models/index.model.js';
import { generateRandomToken, hashData } from '../src/services/crypto.service.js';
import dotenv from 'dotenv';

dotenv.config();

// Ambil consumer name dari argumen command line
const consumerName = process.argv[2];

if (!consumerName) {
  console.error('Please provide a consumer name as argument');
  process.exit(1);
}

const regenerateApiKey = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established');

    // Cari consumer berdasarkan nama
    const consumer = await ConsumerModel.findOne({
      where: { name: consumerName }
    });

    if (!consumer) {
      console.error(`Consumer "${consumerName}" not found`);
      process.exit(1);
    }

    // Generate API key baru
    const apiKey = generateRandomToken(32);
    const apiKeySalt = generateRandomToken(8);
    const apiKeyHash = hashData(apiKey + apiKeySalt);
    
    // Update API key consumer
    await consumer.update({
      api_key_hash: apiKeyHash,
      api_key_salt: apiKeySalt
    });
    
    console.log('API key successfully regenerated:');
    console.log('Consumer ID:', consumer.id);
    console.log('Consumer Name:', consumer.name);
    console.log('New API Key (save this!):', apiKey);
    
    // Close connection
    await sequelize.close();
  } catch (error) {
    console.error('Error regenerating API key:', error);
  }
};

regenerateApiKey();