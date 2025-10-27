import axios from 'axios';
import { config } from '../config/env';
import { Client, Databases, ID, Query } from 'node-appwrite';

const DATABASE_ID = config.appwrite.databaseId;

// Collection IDs (these need to be created in Appwrite)
const COLLECTIONS = {
  USERS: 'users',
  USER_PROFILES: 'user_profiles',
  SESSIONS: 'sessions',
  MESSAGES: 'messages',
  USER_PROGRESS: 'user_progress',
  SAVED_VOCABULARY: 'saved_vocabulary',
  TTS_CACHE: 'tts_cache',
};

const client = new Client()
  .setEndpoint(config.appwrite.endpoint)
  .setProject(config.appwrite.projectId)
  .setKey(config.appwrite.apiKey);

const databases = new Databases(client);

export interface User {
  $id?: string;
  id: string;
  email: string;
  display_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  $id?: string;
  user_id: string;
  native_language?: string;
  target_language?: string;
  proficiency_level?: 'beginner' | 'intermediate' | 'advanced';
  learning_goals?: string[];
  preferred_topics?: string[];
  custom_system_prompt?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  $id?: string;
  id: string;
  user_id: string;
  difficulty?: string;
  topic?: string;
  room_name?: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  status?: 'active' | 'completed' | 'abandoned';
}

export interface Message {
  $id?: string;
  session_id: string;
  user_id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export const AppwriteDatabaseService = {
  // ===== Users =====
  async createUser(user: { id: string; email: string; display_name?: string }): Promise<any> {
    // TODO: Implement with axios
    console.log('createUser called but not implemented');
    return null;
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<any> {
    // TODO: Implement with axios
    console.log('updateUser called but not implemented');
    return null;
  },

  async getUserById(userId: string): Promise<any> {
    // TODO: Implement with axios
    console.log('getUserById called but not implemented');
    return null;
  },

  // ===== User Profiles =====
  async createOrUpdateProfile(profile: UserProfile): Promise<any> {
    // TODO: Implement with axios
    console.log('createOrUpdateProfile called but not implemented');
    return null;
  },

  async getProfileByUserId(userId: string): Promise<any> {
    // TODO: Implement with axios
    console.log('getProfileByUserId called but not implemented');
    return null;
  },

  // ===== Sessions =====
  async createSession(session: {
    id: string;
    user_id: string;
    difficulty?: string;
    topic?: string;
    room_name?: string;
  }): Promise<any> {
    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SESSIONS,
      session.id,
      {
        ...session,
        started_at: new Date().toISOString(),
        status: 'active',
      }
    );
    return result;
  },

  async endSession(sessionId: string): Promise<any> {
    try {
      // First get the session
      const session = await this.getSessionById(sessionId);
      if (!session) return null;

      const startedAt = new Date(session.started_at || '');
      const endedAt = new Date();
      const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

      const result = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.SESSIONS,
        sessionId,
        {
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSeconds,
          status: 'completed',
        }
      );
      return result;
    } catch (error) {
      console.error('End session error:', error);
      return null;
    }
  },

  async getSessionById(sessionId: string): Promise<any> {
    try {
      const result = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.SESSIONS,
        sessionId
      );
      return result;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  },

  async getUserSessions(userId: string, limit = 50): Promise<any[]> {
    // TODO: Implement with proper query encoding
    console.log('getUserSessions called but not fully implemented');
    return [];
  },

  async getActiveSessions(userId: string): Promise<any[]> {
    // TODO: Implement with proper query encoding
    console.log('getActiveSessions called but not fully implemented');
    return [];
  },

  // ===== Messages =====
  async saveMessage(message: {
    session_id: string;
    user_id?: string;
    role: 'user' | 'assistant';
    content: string;
  }): Promise<any> {
    const documentId = ID.unique();
    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      documentId,
      {
        ...message,
        created_at: new Date().toISOString(),
      }
    );
    return result;
  },

  async getSessionMessages(sessionId: string): Promise<any[]> {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      [
        Query.equal('session_id', sessionId),
        Query.orderAsc('created_at'),
      ]
    );
    return result.documents;
  },

  async getUserMessages(userId: string, limit = 100): Promise<any[]> {
    try {
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [
          Query.equal('user_id', userId),
          Query.orderDesc('created_at'),
          Query.limit(limit),
        ]
      );
      return result.documents;
    } catch (error) {
      console.error('Database query error:', error);
      // Fallback: return empty array
      return [];
    }
  },

  async getAllMessages(limit = 100): Promise<any[]> {
    try {
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [
          Query.orderDesc('created_at'),
          Query.limit(limit),
        ]
      );
      return result.documents;
    } catch (error) {
      console.error('Database query error:', error);
      return [];
    }
  },

  // ===== User Progress =====
  async trackProgress(progress: {
    user_id: string;
    session_id?: string;
    metric_type: string;
    metric_value: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // TODO: Implement with axios
    console.log('trackProgress called but not implemented');
  },

  async getUserProgress(userId: string, limit = 100): Promise<any[]> {
    // TODO: Implement with axios
    console.log('getUserProgress called but not implemented');
    return [];
  },

  // ===== Saved Vocabulary =====
  async saveVocabulary(vocab: {
    user_id: string;
    word_or_phrase: string;
    translation?: string;
    context?: string;
    difficulty_level?: string;
  }): Promise<any> {
    // TODO: Implement with axios
    console.log('saveVocabulary called but not implemented');
    return null;
  },

  async getUserVocabulary(userId: string): Promise<any[]> {
    // TODO: Implement with axios
    console.log('getUserVocabulary called but not implemented');
    return [];
  },

  // ===== TTS Cache =====
  async getTTSCache(chatId: string): Promise<any | null> {
    try {
      const result = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.TTS_CACHE,
        chatId
      );

      // Update last_accessed_at if found
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.TTS_CACHE,
        chatId,
        {
          last_accessed_at: new Date().toISOString(),
        }
      );

      return result;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  },

  async saveTTSCache(ttsCache: {
    chat_id: string;
    text: string;
    voice_id?: string;
    s3_url: string;
    s3_key: string;
  }): Promise<void> {
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.TTS_CACHE,
        ttsCache.chat_id,
        {
          ...ttsCache,
          created_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        }
      );
    } catch (error: any) {
      // Handle duplicate key error (cache already exists)
      if (error.code === 409) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.TTS_CACHE,
          ttsCache.chat_id,
          {
            last_accessed_at: new Date().toISOString(),
          }
        );
      } else {
        throw error;
      }
    }
  },
};