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

### Core Frameworks & Runtime

- **[Node.js](https://nodejs.org/)** >= 20.x - JavaScript runtime
- **[Express.js](https://expressjs.com/)** - Web framework for Node.js
- **[TypeScript](https://www.typescriptlang.org/)** - Typed JavaScript for better development experience

### AI & Voice Services

- **[Cerebras API](https://cerebras.ai/)** - LLaMA 3.3 70B model for AI teacher intelligence
- **[Cartesia API](https://cartesia.ai/)** - High-quality Text-to-Speech (TTS) with Sonic-2 model
- **[Deepgram API](https://deepgram.com/)** - Speech-to-Text (STT) with Nova-2 model
- **[LiveKit Agents](https://docs.livekit.io/agents/overview/)** - Real-time AI agent framework for voice conversations

### Database & Storage

- **[PostgreSQL](https://www.postgresql.org/)** >= 13.x - Primary relational database
- **[Appwrite](https://appwrite.io/)** - Backend-as-a-Service for user management and file storage

- **[Helmet](https://helmetjs.github.io/)** - Security middleware for Express.js
- **[CORS](https://expressjs.com/en/resources/middleware/cors.html)** - Cross-origin resource sharing

### Development Tools

- **[TSX](https://tsx.is/)** - TypeScript execution and REPL
- **[ESLint](https://eslint.org/)** - Code linting with TypeScript support
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Jest](https://jestjs.io/)** - Testing framework
- **[Docker](https://www.docker.com/)** - Containerization
- **[LiveKit CLI](https://docs.livekit.io/cli/)** - LiveKit development and deployment tools

### Additional Libraries

- **[Axios](https://axios-http.com/)** - HTTP client for API requests
- **[UUID](https://github.com/uuidjs/uuid)** - Unique identifier generation
- **[Form-Data](https://www.npmjs.com/package/form-data)** - Multipart form data handling
- **[pg](https://node-postgres.com/)** - PostgreSQL client for Node.js

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
PORT=3550
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

### Development

```bash
# Start the main backend server with hot reload
npm run dev

# Start the LiveKit agent worker separately
npm run dev:agent

# Run both server and agent concurrently (requires additional setup)
npm run dev && npm run dev:agent
```

### Production

```bash
# Build the TypeScript code
npm run build

# Start the compiled server
npm start

# Start the agent worker
npm run start:agent
```

### Testing & Quality

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code with Prettier
npm run format
```

### Maintenance Scripts

```bash
# Set up Appwrite collections and permissions
npm run setup:appwrite

# Clean up expired LiveKit sessions
npm run cleanup

# Auto-cleanup with watch mode
npm run cleanup:watch
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
│   ├── agent/              # LiveKit agent implementations
│   │   ├── standalone/     # Standalone agent configurations
│   │   ├── language-teacher.agent.ts  # Main AI teacher agent
│   │   └── worker.ts       # Agent worker process
│   ├── config/             # Configuration files
│   │   ├── appwrite.ts     # Appwrite client setup
│   │   ├── database.ts     # Database connection
│   │   ├── env.ts          # Environment validation
│   │   └── firebase.ts     # Firebase admin setup
│   ├── middleware/         # Custom Express middleware
│   │   ├── appwrite-auth.middleware.ts  # Appwrite authentication
│   │   └── auth.middleware.ts           # General auth middleware
│   ├── routes/             # API route handlers
│   │   ├── appwrite-auth.routes.ts  # Appwrite auth endpoints
│   │   ├── auth.routes.ts           # Authentication routes
│   │   ├── conversation.routes.ts   # Conversation management
│   │   └── user.routes.ts           # User profile routes
│   ├── services/           # Business logic services
│   │   ├── agent.service.ts         # Agent management
│   │   ├── appwrite-auth.service.ts # Appwrite authentication
│   │   ├── appwrite-db.service.ts   # Appwrite database operations
│   │   ├── appwrite-storage.service.ts # File storage
│   │   ├── cartesia.service.ts      # TTS service
│   │   ├── cerebras.service.ts      # LLM service
│   │   ├── db.service.ts            # PostgreSQL operations
│   │   ├── deepgram.service.ts      # STT service
│   │   ├── livekit.service.ts       # LiveKit room management
│   │   ├── s3.service.ts            # AWS S3 storage
│   │   └── user.service.ts          # User management
│   ├── types/               # TypeScript type definitions
│   │   ├── conversation.ts  # Conversation types
│   │   └── user.ts          # User types
│   ├── agent-worker.ts      # Agent worker entry point
│   └── index.ts             # Main server entry point
├── db/                     # Database schema and migrations
│   └── schema.sql          # PostgreSQL schema
├── scripts/                # Utility scripts
│   ├── setup-appwrite.ts   # Appwrite initialization
│   ├── cleanup-sessions.ts # Session cleanup
│   └── auto-cleanup.ts     # Automated cleanup
├── public/                 # Static files
│   └── test-voice.html     # Voice testing interface
├── livekit.toml            # LiveKit agent configuration
├── docker-compose.yml      # Docker services configuration
├── Dockerfile              # Main application container
├── Dockerfile.agent        # Agent-specific container
└── package.json            # Dependencies and scripts
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
