import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';

export class DeepgramService {
  private client: AxiosInstance;

  // Pricing per character (in USD)
  // Deepgram charges approximately $0.000015 per character for Aura models
  private readonly pricing = {
    'aura-2-thalia-en': 0.000015, // Female voice
  };

  constructor() {
    const apiKey = config.deepgram.apiKey;
    console.log('🔧 Deepgram service initialized with API key present:', !!apiKey);

    this.client = axios.create({
      baseURL: 'https://api.deepgram.com',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Calculate cost for TTS generation
   */
  private calculateCost(text: string, model: string): number {
    const charCount = text.length;
    const rate = this.pricing[model as keyof typeof this.pricing] || 0.000015;
    return charCount * rate;
  }

  /**
   * Generate speech from text using Deepgram TTS
   * Returns audio data as Buffer
   */
  async generateSpeech(text: string, voiceId?: string): Promise<Buffer> {
    const model = voiceId || 'aura-2-thalia-en'; // Default to female voice
    const startTime = Date.now();

    try {
      console.log('🔊 Starting Deepgram TTS request...');
      console.log(`  Model: ${model}`);
      console.log(`  Text length: ${text.length} characters`);

      const response = await axios.post(
        'https://api.deepgram.com/v1/speak',
        {
          text: text,
        },
        {
          params: {
            model: model,
            encoding: 'mp3',
          },
          headers: {
            'Authorization': `Token ${config.deepgram.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 30000, // 30 second timeout
        }
      );

      console.log('🔊 Deepgram API response received');
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${response.headers['content-type']}`);
      console.log(`  Content-Length: ${response.headers['content-length']}`);

      const audioBuffer = Buffer.from(response.data);
      const duration = Date.now() - startTime;

      // Calculate cost and metrics
      const charCount = text.length;
      const cost = this.calculateCost(text, model);
      const audioSizeKB = (audioBuffer.length / 1024).toFixed(2);

      // Log TTS metrics for debugging
      console.log('✅ Deepgram TTS Generation successful:');
      console.log(`  Model: ${model}`);
      console.log(`  Characters: ${charCount}`);
      console.log(`  Cost: $${cost.toFixed(6)}`);
      console.log(`  Audio size: ${audioSizeKB} KB`);
      console.log(`  Generation time: ${duration}ms`);
      console.log(`  Text preview: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

      return audioBuffer;
    } catch (error) {
      console.error('❌ Deepgram TTS error:', error);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Headers:`, error.response.headers);
        console.error(`  Data:`, error.response.data);
      }
      throw new Error(`Failed to generate speech: ${error}`);
    }
  }

  /**
   * Test connection to Deepgram API
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Deepgram connection...');
      const response = await axios.post(
        'https://api.deepgram.com/v1/speak',
        { text: 'Hello' },
        {
          params: { model: 'aura-2-thalia-en', encoding: 'mp3' },
          headers: {
            'Authorization': `Token ${config.deepgram.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 10000,
        }
      );
      const result = response.data && Buffer.from(response.data).length > 0;
      console.log('✅ Deepgram connection test successful');
      return result;
    } catch (error) {
      console.error('❌ Deepgram connection test failed:', error.message);
      return false;
    }
  }
}

export const deepgramService = new DeepgramService();