# Getting Started

This guide will help you set up and run the Language Learning Backend with Cerebras and LiveKit integration.

## Prerequisites

- **Node.js** >= 20.x ([Download](https://nodejs.org/))
- **pnpm** package manager ([Install](https://pnpm.io/installation))
- **Cerebras API Key** ([Get one](https://cerebras.ai/))
- **LiveKit Account** ([Sign up](https://livekit.io/))

## Step 1: Install Dependencies

```bash
cd language_learning_backend
pnpm install
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Cerebras API
CEREBRAS_API_KEY=your-actual-cerebras-api-key-here
CEREBRAS_API_URL=https://api.cerebras.ai/v1

# LiveKit Configuration
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=wss://your-project.livekit.cloud
```

### How to Get API Keys

**Cerebras:**
1. Go to [cerebras.ai](https://cerebras.ai/)
2. Sign up for an account
3. Navigate to API settings
4. Generate a new API key

**LiveKit:**
1. Go to [livekit.io](https://livekit.io/) and sign up
2. Create a new project
3. Go to Settings → Keys
4. Copy your API Key, API Secret, and WebSocket URL

## Step 3: Start the Development Server

```bash
pnpm dev
```

You should see:

```
==================================================
🚀 Language Learning Backend Server
==================================================
Environment: development
Server running on: http://localhost:3000
Health check: http://localhost:3000/health
Status check: http://localhost:3000/status
==================================================

📋 Available endpoints:
  POST   /api/conversation/start
  POST   /api/conversation/:id/end
  GET    /api/conversation/:id
  GET    /api/conversation/sessions/active
  POST   /api/conversation/test-cerebras

🧪 Test Pages:
  Voice Test: http://localhost:3000/test-voice.html

✨ Server is ready to accept requests!
```

## Step 4: Test the API

### 4.1 Check System Status

Open your browser and navigate to:

```
http://localhost:3000/status
```

You should see:

```json
{
  "status": "operational",
  "services": {
    "cerebras": "connected",
    "livekit": "connected"
  },
  "timestamp": "2025-10-02T..."
}
```

If any service shows "disconnected", check your API keys in `.env`.

### 4.2 Test Cerebras API

Use curl or Postman to test the Cerebras integration:

```bash
curl -X POST http://localhost:3000/api/conversation/test-cerebras \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! Can you help me learn Spanish?",
    "difficulty": "beginner"
  }'
```

Expected response:

```json
{
  "success": true,
  "userMessage": "Hello! Can you help me learn Spanish?",
  "aiResponse": "¡Hola! Of course I can help you...",
  "difficulty": "beginner"
}
```

### 4.3 Test Voice Conversation (Browser)

1. Open your browser
2. Navigate to: `http://localhost:3000/test-voice.html`
3. Select difficulty level and optional topic
4. Click "Start Conversation"
5. Allow microphone access when prompted
6. Start speaking!

**Note:** The current version creates rooms and handles connections, but the AI agent that responds to voice is not yet fully integrated. You'll be able to connect and transmit audio, but you won't receive AI responses yet. This requires:
- Speech-to-Text integration (Cartesia or OpenAI Whisper)
- Text-to-Speech integration (Cartesia or OpenAI TTS)
- Agent spawning logic

## Step 5: What Works Now vs. What's Coming

### ✅ Currently Working

- Express.js server with TypeScript
- Cerebras LLM integration for text-based conversations
- LiveKit room creation and management
- User token generation for room access
- WebSocket connections to LiveKit
- Test endpoints for debugging
- Session management (in-memory)

### 🚧 Coming Next (Phase 2)

- **AI Agent Implementation:**
  - Automatic agent spawning when user joins room
  - Speech-to-Text (STT) using Cartesia API
  - Text-to-Speech (TTS) using Cartesia API
  - Real-time voice processing pipeline

- **Database Integration:**
  - PostgreSQL setup
  - Conversation history storage
  - User progress tracking

- **Authentication:**
  - Firebase Auth integration
  - User accounts and profiles

## Project Structure

```
language_learning_backend/
├── src/
│   ├── config/
│   │   └── env.ts              # Environment configuration
│   ├── services/
│   │   ├── cerebras.service.ts # Cerebras API wrapper
│   │   └── livekit.service.ts  # LiveKit room management
│   ├── routes/
│   │   └── conversation.routes.ts # API endpoints
│   ├── types/
│   │   └── conversation.ts     # TypeScript types
│   ├── agent/
│   │   └── agent.ts            # AI agent (WIP)
│   └── index.ts                # Main server file
├── public/
│   └── test-voice.html         # Voice test page
├── agent/
│   ├── language_teacher_agent.py  # Python agent (alternative)
│   └── requirements.txt        # Python dependencies
├── package.json
├── tsconfig.json
├── .env.example
└── GETTING_STARTED.md         # This file
```

## Development Commands

```bash
# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Format code
pnpm format
```

## Troubleshooting

### "Cerebras: disconnected" in /status

- Check that `CEREBRAS_API_KEY` is set correctly in `.env`
- Verify your API key is active on Cerebras dashboard
- Check your internet connection

### "LiveKit: disconnected" in /status

- Verify `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL` are correct
- Make sure the LiveKit URL starts with `wss://` (WebSocket Secure)
- Check that your LiveKit project is active

### Port already in use

If port 3000 is already taken:

```bash
# Change PORT in .env file
PORT=3001
```

### Microphone not working in browser

- Make sure you're accessing via `http://localhost` (not `http://127.0.0.1`)
- Check browser permissions for microphone access
- Try using Chrome or Firefox (best WebRTC support)

## Next Steps

1. **Integrate Cartesia for STT/TTS**
   - Sign up for [Cartesia](https://cartesia.ai/)
   - Add `CARTESIA_API_KEY` to `.env`
   - Implement STT/TTS in agent

2. **Set up Database**
   - Install PostgreSQL
   - Create database schema
   - Implement data persistence

3. **Add Authentication**
   - Set up Firebase project
   - Integrate Firebase Auth
   - Protect API endpoints

4. **Build Frontend**
   - Create Next.js app
   - Implement user interface
   - Connect to backend APIs

## Resources

- [Cerebras Documentation](https://docs.cerebras.ai/)
- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit Agents Guide](https://docs.livekit.io/agents/)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## Support

If you encounter issues:

1. Check the server logs for error messages
2. Verify all environment variables are set
3. Test individual services using `/status` endpoint
4. Review the [plan.md](./plan.md) for architecture details

---

**Happy Coding! 🚀**
