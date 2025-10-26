import { storage } from '../config/appwrite';
import { config } from '../config/env';
import { ID } from 'appwrite';
import crypto from 'crypto';

const BUCKET_ID = config.appwrite.storageBucketId;

export class AppwriteStorageService {
  /**
   * Generate a unique chat_id from text and voiceId
   * This ensures the same text + voice combination always gets the same chat_id
   */
  static generateChatId(text: string, voiceId?: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${text}|${voiceId || 'default'}`)
      .digest('hex');
    return hash.substring(0, 32); // Use first 32 characters
  }

  /**
   * Upload audio buffer to Appwrite Storage
   */
  static async uploadAudio(chatId: string, audioBuffer: Buffer): Promise<string> {
    if (!BUCKET_ID) {
      throw new Error('Appwrite storage bucket ID not configured');
    }

    const fileName = `${chatId}.mp3`;

    try {
      // Create a File object from the buffer
      const file = new File([audioBuffer], fileName, { type: 'audio/mpeg' });

      // Generate unique file ID
      const fileId = ID.unique();

      // Upload file to Appwrite Storage
      await storage.createFile(
        BUCKET_ID,
        fileId,
        file
      );

      console.log(`✅ Uploaded TTS audio to Appwrite Storage: ${fileName}`);

      // Return the file view URL
      const fileUrl = storage.getFileView(BUCKET_ID, fileId);
      return fileUrl;
    } catch (error) {
      console.error('❌ Failed to upload to Appwrite Storage:', error);
      throw error;
    }
  }

  /**
   * Get the Appwrite Storage file URL from a chat_id
   * Note: This assumes the file ID is stored in the database
   */
  static getFileUrl(fileId: string): string {
    if (!BUCKET_ID) {
      throw new Error('Appwrite storage bucket ID not configured');
    }

    return storage.getFileView(BUCKET_ID, fileId);
  }

  /**
   * Generate a presigned URL for accessing the audio file
   * Appwrite doesn't have direct presigned URLs like S3,
   * but getFileView provides public access if bucket is public
   */
  static async getPresignedUrl(fileId: string, _expiresIn: number = 3600): Promise<string> {
    if (!BUCKET_ID) {
      throw new Error('Appwrite storage bucket ID not configured');
    }

    try {
      // For public buckets, getFileView returns a direct URL
      // For private buckets, you might need to implement a proxy endpoint
      const fileUrl = storage.getFileView(BUCKET_ID, fileId);
      return fileUrl;
    } catch (error) {
      console.error('❌ Failed to generate file URL:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Appwrite Storage
   */
  static async deleteFile(fileId: string): Promise<void> {
    if (!BUCKET_ID) {
      throw new Error('Appwrite storage bucket ID not configured');
    }

    try {
      await storage.deleteFile(BUCKET_ID, fileId);
      console.log(`✅ Deleted file from Appwrite Storage: ${fileId}`);
    } catch (error) {
      console.error('❌ Failed to delete file from Appwrite Storage:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(fileId: string): Promise<any> {
    if (!BUCKET_ID) {
      throw new Error('Appwrite storage bucket ID not configured');
    }

    try {
      const file = await storage.getFile(BUCKET_ID, fileId);
      return file;
    } catch (error) {
      console.error('❌ Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * List files in the bucket (for admin purposes)
   */
  static async listFiles(): Promise<any[]> {
    if (!BUCKET_ID) {
      throw new Error('Appwrite storage bucket ID not configured');
    }

    try {
      const result = await storage.listFiles(BUCKET_ID);
      return (result as any).files || [];
    } catch (error) {
      console.error('❌ Failed to list files:', error);
      throw error;
    }
  }
}