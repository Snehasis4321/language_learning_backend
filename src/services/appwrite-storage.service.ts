import { config } from '../config/env';
import axios from 'axios';
import crypto from 'crypto';
import FormData from 'form-data';

const BUCKET_ID = config.appwrite.storageBucketId;
const API_ENDPOINT = config.appwrite.endpoint;
const PROJECT_ID = config.appwrite.projectId;
const API_KEY = config.appwrite.apiKey;

const headers = {
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY,
  'Content-Type': 'application/json',
};

async function makeRequest(method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH', url: string, data?: any, contentType?: string) {
  const requestHeaders = { ...headers };
  if (contentType) {
    requestHeaders['Content-Type'] = contentType;
  }

  try {
    const response = await axios({
      method,
      url: `${API_ENDPOINT}${url}`,
      headers: requestHeaders,
      data,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Appwrite Storage API error:', error);
    throw error;
  }
}

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
      // Generate unique file ID
      const fileId = crypto.randomBytes(16).toString('hex');

      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: fileName,
        contentType: 'audio/mpeg',
      });

      // Upload file to Appwrite Storage using REST API
      const uploadHeaders = {
        ...headers,
        ...formData.getHeaders(),
      };

      console.log(`📤 Uploading TTS audio to Appwrite Storage bucket: ${BUCKET_ID}`);

      await axios.post(
        `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files`,
        formData,
        {
          headers: uploadHeaders,
          timeout: 10000, // 10 second timeout
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      console.log(`✅ File uploaded successfully to Appwrite Storage`);

      console.log(`✅ Uploaded TTS audio to Appwrite Storage: ${fileName} (ID: ${fileId})`);

      // Return the file ID for later retrieval
      return fileId;
    } catch (error) {
      console.error('❌ Failed to upload to Appwrite Storage:', error);
      throw error;
    }
  }

  /**
    * Get the Appwrite Storage file URL from a file ID
    * Note: This assumes the file ID is stored in the database
    */
  static getFileUrl(fileId: string): string {
    if (!BUCKET_ID) {
      throw new Error('Appwrite storage bucket ID not configured');
    }

    // Return the file view URL using REST API endpoint
    return `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view`;
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
      return this.getFileUrl(fileId);
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
      await makeRequest('DELETE', `/storage/buckets/${BUCKET_ID}/files/${fileId}`);
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
      return await makeRequest('GET', `/storage/buckets/${BUCKET_ID}/files/${fileId}`);
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
      const result = await makeRequest('GET', `/storage/buckets/${BUCKET_ID}/files`);
      return result.files || [];
    } catch (error) {
      console.error('❌ Failed to list files:', error);
      throw error;
    }
  }
}