// AWS S3 Storage Service for TTS caching
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/env';
import crypto from 'crypto';

class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    console.log('🔧 Initializing S3 client...');
    console.log(`  Region: ${config.aws.region}`);
    console.log(`  Bucket: ${config.aws.s3BucketName}`);

    // Initialize S3 client with explicit credential provider
    this.s3Client = new S3Client({
      region: config.aws.region,
    });

    this.bucketName = config.aws.s3BucketName;

    if (!this.bucketName) {
      console.warn('⚠️ AWS S3 bucket name not configured. TTS caching will be disabled.');
    } else {
      console.log('✅ S3 client initialized successfully');
    }
  }

  generateS3Key(chatId: string): string {
    return `tts-cache/${chatId}.mp3`;
  }

  generateChatId(text: string, voiceId?: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${text}|${voiceId || 'default'}`)
      .digest('hex');
    return hash.substring(0, 32); // Use first 32 characters
  }

  async uploadAudio(chatId: string, audioBuffer: Buffer): Promise<string> {
    if (!this.bucketName) {
      console.error('❌ S3 bucket name not configured');
      throw new Error('S3 bucket name not configured');
    }

    const s3Key = this.generateS3Key(chatId);
    console.log(`📤 Starting S3 upload to bucket: ${this.bucketName}, key: ${s3Key}`);
    console.log(`📤 Audio buffer size: ${audioBuffer.length} bytes`);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
    });

    try {
      console.log(`📤 Sending S3 put command...`);
      const startTime = Date.now();
      const result = await this.s3Client.send(command);
      const uploadTime = Date.now() - startTime;
      console.log(`📤 S3 upload completed in ${uploadTime}ms`);

      // Generate presigned URL for private bucket access
      console.log(`🔗 Generating presigned URL for: ${s3Key}`);
      const presignedUrl = await this.getPresignedUrl(s3Key, 3600); // 1 hour expiry
      console.log(`✅ Uploaded TTS audio to S3: ${s3Key}`);
      console.log(`✅ Presigned URL generated: ${presignedUrl.substring(0, 100)}...`);
      return presignedUrl;
    } catch (error) {
      console.error('❌ Failed to upload to S3:', error);
      console.error('❌ S3 Error details:', {
        bucket: this.bucketName,
        key: s3Key,
        region: config.aws.region,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async getPresignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    try {
      const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return presignedUrl;
    } catch (error) {
      console.error('❌ Failed to generate presigned URL:', error);
      throw error;
    }
  }

  getS3Url(chatId: string): string {
    const s3Key = this.generateS3Key(chatId);
    return `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;
  }

  extractS3Key(s3Url: string): string {
    const urlParts = s3Url.split('/');
    // Get everything after the bucket domain
    return urlParts.slice(3).join('/');
  }
}

export const s3Service = new S3Service();
