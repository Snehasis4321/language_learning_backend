import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
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
