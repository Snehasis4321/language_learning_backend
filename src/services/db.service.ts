import { query } from '../config/database';

export interface User {
  id: string;
  email: string;
  display_name?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserProfile {
  user_id: string;
  native_language?: string;
  target_language?: string;
  proficiency_level?: 'beginner' | 'intermediate' | 'advanced';
  learning_goals?: string[];
  preferred_topics?: string[];
  custom_system_prompt?: string;
}

export interface Session {
  id: string;
  user_id: string;
  difficulty?: string;
  topic?: string;
  room_name?: string;
  started_at?: Date;
  ended_at?: Date;
  duration_seconds?: number;
  status?: 'active' | 'completed' | 'abandoned';
}

export interface Message {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: Date;
}

export const dbService = {
  // ===== Users =====
  async createUser(user: { id: string; email: string; display_name?: string }): Promise<User> {
    const result = await query(
      `INSERT INTO users (id, email, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user.id, user.email, user.display_name]
    );
    return result.rows[0];
  },

  async getUserById(userId: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0] || null;
  },

  // ===== User Profiles =====
  async createOrUpdateProfile(profile: UserProfile): Promise<UserProfile> {
    const result = await query(
      `INSERT INTO user_profiles (
        user_id, native_language, target_language, proficiency_level,
        learning_goals, preferred_topics, custom_system_prompt
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        native_language = EXCLUDED.native_language,
        target_language = EXCLUDED.target_language,
        proficiency_level = EXCLUDED.proficiency_level,
        learning_goals = EXCLUDED.learning_goals,
        preferred_topics = EXCLUDED.preferred_topics,
        custom_system_prompt = EXCLUDED.custom_system_prompt,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        profile.user_id,
        profile.native_language,
        profile.target_language,
        profile.proficiency_level,
        profile.learning_goals,
        profile.preferred_topics,
        profile.custom_system_prompt,
      ]
    );
    return result.rows[0];
  },

  async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    const result = await query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  },

  // ===== Sessions =====
  async createSession(session: {
    id: string;
    user_id: string;
    difficulty?: string;
    topic?: string;
    room_name?: string;
  }): Promise<Session> {
    const result = await query(
      `INSERT INTO sessions (id, user_id, difficulty, topic, room_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [session.id, session.user_id, session.difficulty, session.topic, session.room_name]
    );
    return result.rows[0];
  },

  async endSession(sessionId: string): Promise<Session | null> {
    const result = await query(
      `UPDATE sessions
       SET ended_at = CURRENT_TIMESTAMP,
           duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER,
           status = 'completed'
       WHERE id = $1
       RETURNING *`,
      [sessionId]
    );
    return result.rows[0] || null;
  },

  async getSessionById(sessionId: string): Promise<Session | null> {
    const result = await query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    return result.rows[0] || null;
  },

  async getUserSessions(userId: string, limit = 50): Promise<Session[]> {
    const result = await query(
      `SELECT * FROM sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  async getActiveSessions(userId: string): Promise<Session[]> {
    const result = await query(
      `SELECT * FROM sessions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY started_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // ===== Messages =====
  async saveMessage(message: {
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
  }): Promise<Message> {
    const result = await query(
      `INSERT INTO messages (session_id, role, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [message.session_id, message.role, message.content]
    );
    return result.rows[0];
  },

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    const result = await query(
      `SELECT * FROM messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return result.rows;
  },

  // ===== User Progress =====
  async trackProgress(progress: {
    user_id: string;
    session_id?: string;
    metric_type: string;
    metric_value: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await query(
      `INSERT INTO user_progress (user_id, session_id, metric_type, metric_value, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        progress.user_id,
        progress.session_id,
        progress.metric_type,
        progress.metric_value,
        JSON.stringify(progress.metadata),
      ]
    );
  },

  async getUserProgress(userId: string, limit = 100): Promise<any[]> {
    const result = await query(
      `SELECT * FROM user_progress
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  // ===== Saved Vocabulary =====
  async saveVocabulary(vocab: {
    user_id: string;
    word_or_phrase: string;
    translation?: string;
    context?: string;
    difficulty_level?: string;
  }): Promise<any> {
    const result = await query(
      `INSERT INTO saved_vocabulary (user_id, word_or_phrase, translation, context, difficulty_level)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [vocab.user_id, vocab.word_or_phrase, vocab.translation, vocab.context, vocab.difficulty_level]
    );
    return result.rows[0];
  },

  async getUserVocabulary(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM saved_vocabulary
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // ===== TTS Cache =====
  async getTTSCache(chatId: string): Promise<{
    id: number;
    chat_id: string;
    text: string;
    voice_id?: string;
    s3_url: string;
    s3_key: string;
    created_at: Date;
    last_accessed_at: Date;
  } | null> {
    const result = await query('SELECT * FROM tts_cache WHERE chat_id = $1', [chatId]);

    // Update last_accessed_at if found
    if (result.rows.length > 0) {
      await query(
        'UPDATE tts_cache SET last_accessed_at = CURRENT_TIMESTAMP WHERE chat_id = $1',
        [chatId]
      );
    }

    return result.rows[0] || null;
  },

  async saveTTSCache(ttsCache: {
    chat_id: string;
    text: string;
    voice_id?: string;
    s3_url: string;
    s3_key: string;
  }): Promise<void> {
    await query(
      `INSERT INTO tts_cache (chat_id, text, voice_id, s3_url, s3_key)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (chat_id) DO UPDATE SET
         last_accessed_at = CURRENT_TIMESTAMP`,
      [ttsCache.chat_id, ttsCache.text, ttsCache.voice_id, ttsCache.s3_url, ttsCache.s3_key]
    );
  },
};
