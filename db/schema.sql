-- Database schema for Language Learning App
-- Run this file to initialize your PostgreSQL database

-- Users table (stores Firebase auth user data + app-specific profile)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Firebase UID
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles (learning preferences and goals)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  native_language TEXT,
  target_language TEXT,
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced')),
  learning_goals TEXT[],
  preferred_topics TEXT[],
  custom_system_prompt TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  topic TEXT,
  room_name TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Conversation messages/transcripts
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  metric_type TEXT NOT NULL, -- 'session_completed', 'words_spoken', 'mistakes_corrected', etc.
  metric_value NUMERIC NOT NULL,
  metadata JSONB, -- Additional context
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom vocabulary/phrases saved by users
CREATE TABLE IF NOT EXISTS saved_vocabulary (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_or_phrase TEXT NOT NULL,
  translation TEXT,
  context TEXT,
  difficulty_level TEXT,
  times_reviewed INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TTS Cache table (stores cached TTS audio in S3)
CREATE TABLE IF NOT EXISTS tts_cache (
  id SERIAL PRIMARY KEY,
  chat_id TEXT UNIQUE NOT NULL, -- Unique identifier for each chat/message
  text TEXT NOT NULL, -- The text that was converted to speech
  voice_id TEXT, -- The voice used for TTS
  s3_url TEXT NOT NULL, -- S3 URL where the audio is stored
  s3_key TEXT NOT NULL, -- S3 object key
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_vocabulary_user_id ON saved_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_cache_chat_id ON tts_cache(chat_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
