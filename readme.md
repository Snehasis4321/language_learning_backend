# Language Learning App - Backend

A comprehensive language learning platform backend that enables interactive AI-powered language instruction with real-time voice communication, adaptive learning, and gamification features.

## Overview

This backend powers a language learning application designed to help users improve their speaking skills through direct interaction with an AI teacher. The system provides real-time feedback, pronunciation correction, and adaptive learning experiences.

### Key Capabilities

- **AI-Powered Teaching**: Interactive AI teacher provides personalized instruction and immediate feedback
- **Real-Time Voice Communication**: Live conversation practice with AI agents using natural speech
- **Adaptive Learning**: Content adjusts dynamically based on user proficiency and weak areas
- **Comprehensive Skill Development**: Speaking, listening, reading, writing, grammar, and vocabulary

## How It Works

1. **Sentence Practice**: AI teacher provides sentences for users to practice; users speak the sentences and receive instant feedback on mistakes
2. **Live Conversations**: Join group conversations with AI teacher agents for one-on-one communication practice
3. **Interactive Exercises**: Fill-in-the-blank grammar exercises where users answer verbally and receive real-time evaluation
4. **Progress Tracking**: Continuous monitoring of user progress with adaptive content delivery

## Tech Stack

### Third-Party Services

- **[Cerebras API](https://cerebras.ai/)** - LLaMA 3.3 70B model for AI teacher intelligence
- **[Cartesia API](https://cartesia.ai/)** - Speech-to-Text (STT) and Text-to-Speech (TTS) capabilities
- **[LiveKit](https://livekit.io/)** - Real-time agent framework for voice conversations

### Frameworks & Technologies

- **Backend**: Express.js (Node.js)
- **Frontend**: Next.js
- **Authentication**: Firebase Auth
- **Database**: PostgreSQL

## Prerequisites

- Node.js >= 20.x
- PostgreSQL >= 13.x
- Firebase account and project setup
- API keys for Cerebras, Cartesia, and LiveKit

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd language_learning_backend

# Install dependencies
npm install
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/language_learning

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# AI Services
CEREBRAS_API_KEY=your-cerebras-api-key
CARTESIA_API_KEY=your-cartesia-api-key
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=wss://your-livekit-url
```

## Running the Application

```bash
# Development mode
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run database migrations
npm run migrate
```

## Core Features

### Learning Content

- **Lessons/Courses**: Structured content organized by proficiency level (beginner, intermediate, advanced)
- **Vocabulary**: Flashcards, word lists, and spaced repetition system (SRS)
- **Grammar**: Comprehensive rules, exercises, and contextual examples
- **Practice Exercises**: Multiple choice, fill-in-the-blank, matching, and translation exercises

### Skill Development

- **Speaking Practice**: Voice recording with AI-powered pronunciation feedback
- **Listening Comprehension**: Audio clips, dialogues, and dictation exercises
- **Reading**: Texts with translations and comprehension questions
- **Writing**: Sentence building exercises and essay prompts

### Progress & Engagement

- **User Profiles**: Comprehensive tracking of learning progress, levels, and achievements
- **Progress Analytics**: Detailed statistics, streak tracking, and XP/points system
- **Gamification**: Badges, leaderboards, daily goals, and challenges
- **Adaptive Learning**: AI-driven content adjustment based on user's level and identified weak areas

### Additional Features

- **Dictionary/Translator**: Quick word and phrase lookups
- **Offline Mode**: Download lessons for offline practice
- **Multi-Language Support**: Multiple source and target language pairs
- **Community Features**: Forums and language exchange partner matching
- **Smart Notifications**: Daily practice reminders and progress updates
- **Assessment/Testing**: Placement tests and periodic progress assessments

## API Documentation

API documentation is available at `/api/docs` when running the development server.

Key endpoints include:

- `/api/auth` - Authentication and user management
- `/api/lessons` - Lesson and course content
- `/api/practice` - Practice exercises and sessions
- `/api/voice` - Voice recording and pronunciation feedback
- `/api/progress` - User progress and analytics
- `/api/livekit` - Real-time conversation sessions

## Project Structure

```
language_learning_backend/
├── src/
│   ├── controllers/    # Request handlers
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── middleware/     # Custom middleware
│   ├── utils/          # Utility functions
│   └── config/         # Configuration files
├── tests/              # Test files
├── migrations/         # Database migrations
└── docs/              # Additional documentation
```

## Development

### Code Style

This project uses ESLint and Prettier for code formatting. Run linting with:

```bash
npm run lint
npm run format
```

### Database Migrations

Create a new migration:

```bash
npm run migrate:create migration-name
```

Run migrations:

```bash
npm run migrate:up
```

Rollback migrations:

```bash
npm run migrate:down
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes with appropriate tests
3. Ensure all tests pass and code is linted
4. Submit a pull request with a clear description

## License

[Add your license here]

## Support

For questions or issues, please contact [your-email] or open an issue on GitHub.
