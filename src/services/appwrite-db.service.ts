import { databases } from '../config/appwrite';
import { config } from '../config/env';
import { ID, Query } from 'appwrite';

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
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export const AppwriteDatabaseService = {
  // ===== Users =====
  async createUser(user: { id: string; email: string; display_name?: string }): Promise<any> {
    try {
      const result = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        user.id,
        {
          email: user.email,
          display_name: user.display_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );
      // Temporary fix for migration - bypassing type check
      return (result as any) || null;
    } catch (error: any) {
      // Handle duplicate key error (user already exists)
      if (error.code === 409) {
        return this.updateUser(user.id, {
          email: user.email,
          display_name: user.display_name,
          updated_at: new Date().toISOString(),
        });
      }
      throw error;
    }
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<any> {
    const result = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.USERS,
      userId,
      {
        ...updates,
        updated_at: new Date().toISOString(),
      }
    );
    return result as unknown as User;
  },

  async getUserById(userId: string): Promise<any> {
    try {
      const result = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        userId
      );
      // Temporary fix for migration - bypassing type check
      return (result as any) || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  },

  // ===== User Profiles =====
  async createOrUpdateProfile(profile: UserProfile): Promise<any> {
    try {
      const result = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        profile.user_id,
        {
          ...profile,
          updated_at: new Date().toISOString(),
        }
      );
      // Temporary fix for migration - bypassing type check
      return (result as any) || null;
    } catch (error: any) {
      // Handle duplicate key error (profile already exists)
      if (error.code === 409) {
        const result = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          profile.user_id,
          {
            ...profile,
            updated_at: new Date().toISOString(),
          }
        );
      return (result as any) as User;
      }
      throw error;
    }
  },

  async getProfileByUserId(userId: string): Promise<any> {
    try {
      const result = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        userId
      );
      // Temporary fix for migration - bypassing type check
      return (result as any) || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
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
    return result as unknown as Session;
  },

  async endSession(sessionId: string): Promise<any> {
    try {
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
      // Temporary fix for migration - bypassing type check
      return (result as any) || null;
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
      // Temporary fix for migration - bypassing type check
      return (result as any) || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  },

  async getUserSessions(userId: string, limit = 50): Promise<any[]> {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SESSIONS,
      [
        Query.equal('user_id', userId),
        Query.orderDesc('started_at'),
        Query.limit(limit),
      ]
    );
    return result.documents as any;
  },

  async getActiveSessions(userId: string): Promise<any[]> {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SESSIONS,
      [
        Query.equal('user_id', userId),
        Query.equal('status', 'active'),
        Query.orderDesc('started_at'),
      ]
    );
    return result.documents as any;
  },

  // ===== Messages =====
  async saveMessage(message: {
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
  }): Promise<any> {
    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      ID.unique(),
      {
        ...message,
        created_at: new Date().toISOString(),
      }
    );
      // Temporary fix for migration - bypassing type check
      return (result as any) || null;
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
    return result.documents as any;
  },

  // ===== User Progress =====
  async trackProgress(progress: {
    user_id: string;
    session_id?: string;
    metric_type: string;
    metric_value: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.USER_PROGRESS,
      ID.unique(),
      {
        ...progress,
        recorded_at: new Date().toISOString(),
      }
    );
  },

  async getUserProgress(userId: string, limit = 100): Promise<any[]> {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USER_PROGRESS,
      [
        Query.equal('user_id', userId),
        Query.orderDesc('recorded_at'),
        Query.limit(limit),
      ]
    );
    return result.documents;
  },

  // ===== Saved Vocabulary =====
  async saveVocabulary(vocab: {
    user_id: string;
    word_or_phrase: string;
    translation?: string;
    context?: string;
    difficulty_level?: string;
  }): Promise<any> {
    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SAVED_VOCABULARY,
      ID.unique(),
      {
        ...vocab,
        created_at: new Date().toISOString(),
      }
    );
    return result;
  },

  async getUserVocabulary(userId: string): Promise<any[]> {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SAVED_VOCABULARY,
      [
        Query.equal('user_id', userId),
        Query.orderDesc('created_at'),
      ]
    );
    return result.documents;
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
      if (result) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.TTS_CACHE,
          chatId,
          {
            last_accessed_at: new Date().toISOString(),
          }
        );
      }

      // Temporary fix for migration - bypassing type check
      return (result as any) || null;
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
    appwrite_file_id: string;
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