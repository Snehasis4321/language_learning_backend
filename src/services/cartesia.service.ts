import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';

export class CartesiaService {
  private client: AxiosInstance;

  // Pricing per character (in USD)
  // Cartesia charges approximately $0.000015 per character for Sonic model
  private readonly pricing = {
    'sonic-english': 0.000015,
  };

  constructor() {
    this.client = axios.create({
      baseURL: config.cartesia.apiUrl,
      headers: {
        'X-API-Key': config.cartesia.apiKey,
        'Content-Type': 'application/json',
        'Cartesia-Version': '2024-06-10',
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
   * Generate speech from text using Cartesia TTS
   * Returns audio data as Buffer
   */
  async generateSpeech(text: string, voiceId?: string): Promise<Buffer> {
    const model = 'sonic-english';
    const startTime = Date.now();

    try {
      // Default to a good quality voice if not specified
      const selectedVoiceId = voiceId || '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc'; // Sonic English

      const response = await this.client.post(
        '/tts/bytes',
        {
          model_id: model,
          transcript: text,
          voice: {
            mode: 'id',
            id: selectedVoiceId,
          },
          output_format: {
            container: 'mp3',
            encoding: 'mp3',
            sample_rate: 44100,
          },
          language: 'en',
        },
        {
          responseType: 'arraybuffer',
        }
      );

      const audioBuffer = Buffer.from(response.data);
      const duration = Date.now() - startTime;

      // Calculate cost and metrics
      const charCount = text.length;
      const cost = this.calculateCost(text, model);
      const audioSizeKB = (audioBuffer.length / 1024).toFixed(2);

      // Log TTS metrics for debugging
      console.log('🔊 TTS Generation:');
      console.log(`  Model: ${model}`);
      console.log(`  Characters: ${charCount}`);
      console.log(`  Cost: $${cost.toFixed(6)}`);
      console.log(`  Audio size: ${audioSizeKB} KB`);
      console.log(`  Generation time: ${duration}ms`);
      console.log(`  Text preview: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

      return audioBuffer;
    } catch (error) {
      console.error('Cartesia TTS error:', error);
      throw new Error(`Failed to generate speech: ${error}`);
    }
  }

  /**
   * Test connection to Cartesia API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to generate a simple speech
      const audio = await this.generateSpeech('Hello');
      return audio.length > 0;
    } catch (error) {
      console.error('Cartesia connection test failed:', error);
      return false;
    }
  }
}

export const cartesiaService = new CartesiaService();
