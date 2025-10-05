# Language Learning App - Implementation Plan

## Overview

This document outlines the implementation strategy for the language learning platform, focusing on lesson delivery and real-time AI conversation features.

---

## 1. Lesson Delivery System

### 1.1 User Onboarding & Assessment Flow

1. User signs up/logs in via Firebase Auth
2. Complete placement test to determine proficiency level
3. Select target language and learning goals
4. System assigns appropriate starting level based on assessment
5. Dashboard displays personalized learning path

### 1.2 Content Structure Hierarchy

```
Courses
  └─ Units (thematic grouping)
      └─ Lessons
          └─ Exercises
              └─ Questions/Tasks
```

**Example Structure:**

```
Course: "Spanish for Beginners"
  ├─ Unit 1: "Basic Greetings"
  │   ├─ Lesson 1: "Hello and Goodbye"
  │   │   ├─ Exercise 1: Vocabulary flashcards
  │   │   ├─ Exercise 2: Pronunciation practice
  │   │   └─ Exercise 3: Conversation scenarios
  │   └─ Lesson 2: "Introductions"
  └─ Unit 2: "Numbers and Time"
```

### 1.3 Lesson Content Types

#### A. Vocabulary Lessons

- Word lists with translations
- Audio pronunciation (Cartesia TTS)
- Example sentences with context
- Images/visual aids
- Spaced repetition scheduling

#### B. Grammar Lessons

- Rule explanations with examples
- Interactive exercises (fill-in-the-blank, sentence transformation)
- Common mistake highlights
- Practice sets

#### C. Reading/Listening Comprehension

- Text or audio content
- Comprehension questions
- Vocabulary highlights
- Cultural context notes

#### D. Speaking Practice

- Sentence prompts for user to repeat
- Voice recording upload
- AI-powered pronunciation evaluation (Cerebras + Cartesia)
- Feedback on errors and improvement tips

#### E. Writing Exercises

- Sentence building tasks
- Translation exercises
- Free-form writing with AI review

### 1.4 API Endpoints for Lessons

```javascript
// Get next recommended lesson for user
GET /api/lessons/next
Response: { lessonId, title, type, difficulty, estimatedTime }

// Get specific lesson content
GET /api/lessons/:lessonId
Response: { lesson, exercises, resources }

// Submit exercise answer
POST /api/exercises/:exerciseId/submit
Body: { answer, audioUrl? }
Response: { correct, feedback, score, explanation }

// Mark lesson complete
POST /api/lessons/:lessonId/complete
Body: { completionTime, score }
Response: { xpEarned, nextLesson, achievements }

// Get user progress
GET /api/progress
Response: { currentLevel, xp, streak, completedLessons, weakAreas }
```

### 1.5 Progress Tracking

**Metrics to Track:**

- Lessons completed
- Exercises attempted/completed
- Accuracy rates by skill type
- Time spent learning
- Streak days
- XP/Level progression
- Weak areas identified (for adaptive learning)

**Database Tables:**

```sql
user_progress (user_id, lesson_id, status, score, completed_at)
user_stats (user_id, total_xp, level, streak_days, last_active)
exercise_attempts (user_id, exercise_id, answer, correct, created_at)
```

---

## 2. Real-Time 1-to-1 Conversation System

### 2.1 Session Initiation Flow

```
1. User clicks "Start Conversation" in frontend
2. Frontend → POST /api/conversation/start
   {
     conversationType: "practice" | "free" | "roleplay",
     topic?: "ordering_food",
     difficulty: "beginner"
   }

3. Backend:
   a. Create LiveKit room with unique name
   b. Generate user access token
   c. Spawn AI agent process/worker
   d. Connect agent to room

4. Backend → Response
   {
     roomName: "conv_xyz123",
     token: "eyJhbGc...",
     agentReady: true
   }

5. Frontend connects to LiveKit room with token
6. Real-time conversation begins
```

### 2.2 Real-Time Communication Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   User      │         │  LiveKit Cloud   │         │   AI Agent      │
│  (Browser)  │ ◄─────► │   (WebRTC/SFU)   │ ◄─────► │  (Backend)      │
└─────────────┘         └──────────────────┘         └─────────────────┘
      │                                                        │
      │                                                        ▼
      │                                              ┌──────────────────┐
      │                                              │  Cartesia STT    │
      │                                              │  (Speech→Text)   │
      │                                              └─────────┬────────┘
      │                                                        │
      │                                                        ▼
      │                                              ┌──────────────────┐
      │                                              │  Cerebras LLM    │
      │                                              │  (Generate Reply)│
      │                                              └─────────┬────────┘
      │                                                        │
      │                                                        ▼
      │                                              ┌──────────────────┐
      │                                              │  Cartesia TTS    │
      │                                              │  (Text→Speech)   │
      └──────────────────────────────────────────────────────┴────────┘
                              Audio Stream
```

### 2.3 AI Agent Implementation

#### Tech Stack

- **LiveKit Agents SDK** (Python or Node.js)
- **Cartesia API** for STT and TTS
- **Cerebras API** for LLM responses

#### Agent Workflow

```python
# Pseudo-code for Agent Logic

class LanguageTeacherAgent:
    async def on_user_speech(self, audio_stream):
        # 1. Convert speech to text
        transcript = await cartesia_stt.transcribe(audio_stream)

        # 2. Analyze for mistakes
        analysis = await self.analyze_speech(transcript)

        # 3. Generate contextual response
        context = {
            "user_level": "beginner",
            "topic": "greetings",
            "conversation_history": self.history,
            "detected_errors": analysis.errors
        }

        response = await cerebras_llm.generate(
            prompt=self.build_teacher_prompt(transcript, context),
            model="llama-3.3-70b"
        )

        # 4. Convert response to speech
        audio = await cartesia_tts.synthesize(response.text)

        # 5. Stream audio back to user
        await self.play_audio(audio)

        # 6. Log conversation for progress tracking
        await self.log_interaction(transcript, response, analysis)
```

#### Agent Capabilities

**Practice Mode:**

- Provides prompts: "Try saying: 'Hello, how are you?'"
- Listens to user response
- Evaluates pronunciation and grammar
- Gives specific feedback
- Encourages retry or moves to next prompt

**Free Conversation:**

- Engages in natural dialogue
- Adjusts complexity to user level
- Asks follow-up questions
- Corrects mistakes gently
- Introduces new vocabulary contextually

**Role-Play Scenarios:**

- Sets context (restaurant, job interview, etc.)
- Plays specific role (waiter, interviewer)
- Guides user through scenario
- Provides feedback at end

### 2.4 Conversation Management APIs

```javascript
// Start conversation session
POST /api/conversation/start
Body: { type, topic?, difficulty }
Response: { roomName, token, agentReady }

// End conversation session
POST /api/conversation/:sessionId/end
Response: { duration, summary, feedback, xpEarned }

// Get conversation history
GET /api/conversation/:sessionId/transcript
Response: { messages: [{ speaker, text, timestamp, corrections }] }

// Get available conversation topics
GET /api/conversation/topics
Response: { topics: [{ id, name, difficulty, description }] }
```

### 2.5 Conversation Data Storage

**Tables:**

```sql
conversation_sessions (
  id, user_id, type, topic, started_at, ended_at, duration
)

conversation_messages (
  id, session_id, speaker, text, audio_url,
  detected_errors, corrections, timestamp
)

conversation_feedback (
  id, session_id, overall_score, pronunciation_score,
  grammar_score, vocabulary_used, ai_summary
)
```

---

## 3. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goals:**

- Set up development environment
- Create database schema
- Implement authentication
- Basic API structure

**Tasks:**

1. Initialize Express.js project with TypeScript
2. Set up PostgreSQL database
3. Create database migrations for core tables
4. Implement Firebase Auth middleware
5. Create base API routes structure
6. Set up error handling and logging
7. Environment configuration (.env setup)

**Deliverables:**

- Running Express server
- Database with schema
- Auth endpoints working
- Basic health check endpoints

### Phase 2: Content Delivery System (Week 3-4)

**Goals:**

- Implement lesson/course management
- Create exercise system
- Build progress tracking

**Tasks:**

1. Create lesson CRUD APIs
2. Implement exercise types (multiple choice, fill-in-blank)
3. Build progress tracking endpoints
4. Create user stats calculation
5. Implement XP/level system
6. Add gamification features (badges, streaks)
7. Build recommendation algorithm for next lesson

**Deliverables:**

- Complete lesson management system
- Working exercise submission and grading
- Progress tracking dashboard data
- Recommendation engine

### Phase 3: Voice & AI Features (Week 5-6)

**Goals:**

- Integrate Cartesia for speech
- Implement AI evaluation
- Voice recording handling

**Tasks:**

1. Integrate Cartesia STT API
2. Integrate Cartesia TTS API
3. Create audio file upload handling (S3/Cloud Storage)
4. Implement Cerebras API integration
5. Build pronunciation evaluation logic
6. Create speaking exercise grading system
7. Add text-to-speech for lesson content

**Deliverables:**

- Working voice recording upload
- AI-powered pronunciation feedback
- TTS for reading text aloud
- Speaking exercise evaluation

### Phase 4: Real-Time Conversations (Week 7-8)

**Goals:**

- Implement LiveKit integration
- Build AI agent system
- Create conversation management

**Tasks:**

1. Set up LiveKit server/cloud account
2. Implement room creation and token generation
3. Build AI agent using LiveKit Agents SDK
4. Integrate agent with Cerebras LLM
5. Connect agent STT/TTS pipeline
6. Implement conversation tracking and logging
7. Create conversation feedback system
8. Build different conversation modes (practice, free, roleplay)

**Deliverables:**

- Fully functional real-time conversation system
- AI agent with multiple modes
- Conversation history and analytics
- Performance optimizations

### Phase 5: Testing & Polish (Week 9-10)

**Goals:**

- Comprehensive testing
- Performance optimization
- Documentation

**Tasks:**

1. Unit tests for all services
2. Integration tests for API endpoints
3. Load testing for conversation system
4. Security audit
5. API documentation (Swagger/OpenAPI)
6. Performance profiling and optimization
7. Error monitoring setup (Sentry/similar)
8. CI/CD pipeline setup

**Deliverables:**

- Test coverage > 80%
- Performance benchmarks met
- Complete API documentation
- Production-ready deployment

---

## 4. Technical Considerations

### 4.1 Database Schema Design

**Core Tables:**

```sql
-- Users (managed by Firebase Auth, minimal local data)
users (
  id UUID PRIMARY KEY,
  firebase_uid VARCHAR UNIQUE,
  email VARCHAR,
  display_name VARCHAR,
  target_language VARCHAR,
  proficiency_level VARCHAR,
  created_at TIMESTAMP,
  last_active TIMESTAMP
)

-- Course structure
courses (
  id UUID PRIMARY KEY,
  language VARCHAR,
  title VARCHAR,
  description TEXT,
  difficulty VARCHAR,
  created_at TIMESTAMP
)

units (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  title VARCHAR,
  order_index INT,
  created_at TIMESTAMP
)

lessons (
  id UUID PRIMARY KEY,
  unit_id UUID REFERENCES units(id),
  title VARCHAR,
  content JSONB,
  type VARCHAR,
  difficulty VARCHAR,
  estimated_minutes INT,
  order_index INT,
  created_at TIMESTAMP
)

exercises (
  id UUID PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id),
  type VARCHAR,
  question JSONB,
  correct_answer JSONB,
  options JSONB,
  order_index INT
)

-- User progress
user_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  lesson_id UUID REFERENCES lessons(id),
  status VARCHAR,
  score FLOAT,
  time_spent INT,
  completed_at TIMESTAMP,
  UNIQUE(user_id, lesson_id)
)

user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  total_xp INT DEFAULT 0,
  level INT DEFAULT 1,
  streak_days INT DEFAULT 0,
  last_active_date DATE,
  lessons_completed INT DEFAULT 0,
  total_time_minutes INT DEFAULT 0
)

-- Conversations
conversation_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR,
  topic VARCHAR,
  room_name VARCHAR,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INT
)

conversation_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES conversation_sessions(id),
  speaker VARCHAR,
  text TEXT,
  audio_url VARCHAR,
  detected_errors JSONB,
  corrections JSONB,
  timestamp TIMESTAMP
)
```

### 4.2 Environment Variables Reference

```env
# Server
PORT=3550
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/language_learning

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# AI Services
CEREBRAS_API_KEY=your-key
CEREBRAS_API_URL=https://api.cerebras.ai/v1

CARTESIA_API_KEY=your-key
CARTESIA_STT_URL=https://api.cartesia.ai/stt
CARTESIA_TTS_URL=https://api.cartesia.ai/tts

# LiveKit
LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
LIVEKIT_URL=wss://your-livekit-server.com

# Storage (for audio files)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket

# Optional
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

### 4.3 Scalability Considerations

**For Lessons:**

- Cache lesson content in Redis
- Use CDN for static assets (images, audio files)
- Database read replicas for heavy read operations
- Index frequently queried fields

**For Conversations:**

- LiveKit can scale horizontally
- Use queue system (Bull/RabbitMQ) for agent spawning
- Monitor concurrent conversation limits
- Implement connection pooling
- Rate limiting per user

### 4.4 Security Best Practices

1. **Authentication:**
   - Validate Firebase tokens on every request
   - Use refresh token rotation
   - Implement rate limiting

2. **Data Protection:**
   - Encrypt sensitive data at rest
   - Use HTTPS only
   - Sanitize user inputs
   - Parameterized SQL queries (prevent injection)

3. **API Security:**
   - CORS configuration
   - API key rotation policy
   - Request validation middleware
   - Audit logging for sensitive operations

4. **Conversation Privacy:**
   - Option to delete conversation history
   - Anonymize data for analytics
   - Secure audio file storage with expiration

---

## 5. Testing Strategy

### 5.1 Unit Tests

- Service layer logic
- Utility functions
- Data validation
- Score calculation algorithms

### 5.2 Integration Tests

- API endpoint responses
- Database operations
- External API integrations (mocked)
- Authentication flows

### 5.3 End-to-End Tests

- Complete lesson flow
- Conversation session lifecycle
- User progress tracking
- Multi-step workflows

### 5.4 Performance Tests

- API response times (< 200ms for most endpoints)
- Concurrent conversation handling
- Database query optimization
- Memory leak detection

---

## 6. Monitoring & Analytics

### 6.1 Application Metrics

- API response times
- Error rates by endpoint
- Active conversation sessions
- Database connection pool status

### 6.2 Business Metrics

- Daily/Monthly active users
- Lesson completion rates
- Average session duration
- User retention rates
- Most popular lessons/topics

### 6.3 AI Performance Metrics

- Speech recognition accuracy
- AI response generation time
- TTS latency
- Conversation quality ratings

---

## 7. Next Steps

1. **Set up development environment**
   - Install dependencies (Node.js, PostgreSQL)
   - Create project structure
   - Configure TypeScript

2. **Design detailed database schema**
   - Review and refine table structures
   - Create migration files
   - Seed initial data (sample courses/lessons)

3. **Implement authentication layer**
   - Firebase Admin SDK setup
   - Auth middleware
   - User creation flow

4. **Start with Phase 1 tasks**
   - Follow implementation phases outlined above
   - Track progress with milestones
   - Regular testing and code reviews

---

## 8. Resources & Documentation

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Cerebras API Reference](https://docs.cerebras.ai/)
- [Cartesia API Docs](https://docs.cartesia.ai/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Last Updated:** 2025-10-02
