import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/env';
import crypto from 'crypto';

class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    // Initialize S3 client with AWS CLI credentials (IAM role)
    this.s3Client = new S3Client({
      region: config.aws.region,
      // Credentials will be automatically loaded from:
      // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
      // 2. AWS credentials file (~/.aws/credentials)
      // 3. IAM role for EC2/ECS instances
    });

    this.bucketName = config.aws.s3BucketName;

    if (!this.bucketName) {
      console.warn('⚠️ AWS S3 bucket name not configured. TTS caching will be disabled.');
    }
  }

  /**
   * Generate a unique S3 key for TTS audio based on chat_id
   */
  generateS3Key(chatId: string): string {
    return `tts-cache/${chatId}.mp3`;
  }

  /**
   * Generate a hash-based chat_id from text and voiceId
   * This ensures the same text + voice combination always gets the same chat_id
   */
  generateChatId(text: string, voiceId?: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${text}|${voiceId || 'default'}`)
      .digest('hex');
    return hash.substring(0, 32); // Use first 32 characters
  }

  /**
   * Upload audio buffer to S3
   */
  async uploadAudio(chatId: string, audioBuffer: Buffer): Promise<string> {
    if (!this.bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    const s3Key = this.generateS3Key(chatId);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
    });

    try {
      await this.s3Client.send(command);
      const s3Url = `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;
      console.log(`✅ Uploaded TTS audio to S3: ${s3Key}`);
      return s3Url;
    } catch (error) {
      console.error('❌ Failed to upload to S3:', error);
      throw error;
    }
  }

  /**
   * Generate a presigned URL for accessing the audio file
   * URL expires in 1 hour by default
   */
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

  /**
   * Get the S3 URL from a chat_id
   */
  getS3Url(chatId: string): string {
    const s3Key = this.generateS3Key(chatId);
    return `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Extract S3 key from S3 URL
   */
  extractS3Key(s3Url: string): string {
    const urlParts = s3Url.split('/');
    // Get everything after the bucket domain
    return urlParts.slice(3).join('/');
  }
}

export const s3Service = new S3Service();
