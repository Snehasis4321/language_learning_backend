import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3550,
  nodeEnv: process.env.NODE_ENV || 'development',

  cerebras: {
    apiKey: process.env.CEREBRAS_API_KEY || '',
    apiUrl: process.env.CEREBRAS_API_URL || 'https://api.cerebras.ai/v1',
  },

  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
    url: process.env.LIVEKIT_URL || '',
  },

  cartesia: {
    apiKey: process.env.CARTESIA_API_KEY || '',
    apiUrl: process.env.CARTESIA_API_URL || 'https://api.cartesia.ai',
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    s3BucketName: process.env.AWS_S3_BUCKET_NAME || '',
  },

  database: {
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || '',
  },

  appwrite: {
    endpoint: process.env.APPWRITE_ENDPOINT || 'http://localhost/v1',
    projectId: process.env.APPWRITE_PROJECT_ID || '',
    apiKey: process.env.APPWRITE_API_KEY || '',
    databaseId: process.env.APPWRITE_DATABASE_ID || 'language_learning_db',
    storageBucketId: process.env.APPWRITE_STORAGE_BUCKET_ID || 'tts_cache',
  },
} as const;

// Validate required environment variables
export function validateEnv(): void {
  const required = ['CEREBRAS_API_KEY', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_URL'];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Please create a .env file based on .env.example');
  }
}
