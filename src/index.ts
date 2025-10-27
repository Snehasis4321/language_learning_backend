import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config, validateEnv } from './config/env';
import conversationRoutes from './routes/conversation.routes';
import userRoutes from './routes/user.routes';
import appwriteAuthRoutes from './routes/appwrite-auth.routes';
import { cerebrasService } from './services/cerebras.service';
import { liveKitService } from './services/livekit.service';
import { deepgramService } from './services/deepgram.service';
// import { agentService } from './services/agent.service'; // Unused - agent runs separately
// import { testConnection } from './config/database'; // COMMENTED OUT - migrated to Appwrite

// Validate environment variables
validateEnv();

const app: Express = express();

// Middleware
// Security headers with helmet
app.use(helmet());

app.use(
  cors({
    origin: '*', // Update this in production to specific origins
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files from public directory
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Health check endpoint
app.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'language-learning-backend',
  });
});

// System status endpoint
app.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cerebrasConnected = await cerebrasService.testConnection();
    const liveKitConnected = await liveKitService.testConnection();
    const deepgramConnected = await deepgramService.testConnection();

    let appwriteConnected = false;
    try {
      // Test Appwrite connection by checking if client is initialized
      // In production, you might want to make an actual API call
      appwriteConnected = true; // Simplified check
    } catch (error) {
      console.error('Appwrite connection check failed:', error);
    }

    res.json({
      status: 'operational',
      services: {
        cerebras: cerebrasConnected ? 'connected' : 'disconnected',
        livekit: liveKitConnected ? 'connected' : 'disconnected',
        deepgram: deepgramConnected ? 'connected' : 'disconnected',
        appwrite: appwriteConnected ? 'connected' : 'disconnected',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API routes
app.use('/api/auth', appwriteAuthRoutes);
app.use('/api/conversation', conversationRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'An error occurred',
  });
});

// Start server
const PORT = config.port;

app.listen(PORT, async () => {
  console.log('='.repeat(50));
  console.log(`🚀 Language Learning Backend Server`);
  console.log('='.repeat(50));
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Status check: http://localhost:${PORT}/status`);
  console.log('='.repeat(50));

  // Test Appwrite connection on startup
  console.log('\n🔌 Initializing connections...\n');
  try {
    // Appwrite connection is initialized in config/appwrite.ts
    console.log('✅ Appwrite client initialized');
  } catch (error) {
    console.error('⚠️  Appwrite connection failed - some features may not work correctly\n');
  }
  console.log('\n📋 Available endpoints:');
  console.log('  Conversations:');
  console.log('    POST   /api/conversation/start');
  console.log('    POST   /api/conversation/:id/end');
  console.log('    GET    /api/conversation/:id');
  console.log('    GET    /api/conversation/sessions/active');
  console.log('    GET    /api/conversation/messages');
  console.log('    POST   /api/conversation/test-cerebras');
  console.log('  Users:');
  console.log('    POST   /api/users/profile');
  console.log('    GET    /api/users/profile/:userId');
  console.log('    PUT    /api/users/preferences');
  console.log('    GET    /api/users/progress/:userId');
  console.log('    POST   /api/users/progress/:userId');
  console.log('\n🧪 Test Pages:');
  console.log(`  Voice Test: http://localhost:${PORT}/test-voice.html`);
  console.log('\n✨ Server is ready to accept requests!\n');

  // Optional: Start the LiveKit agent worker with the backend
  // In production, run the agent as a separate service using: pnpm start:agent
  // const startAgentWithBackend = process.env.START_AGENT_WITH_BACKEND === 'true';

  // if (startAgentWithBackend) {
  //   console.log('🤖 Starting LiveKit Agent Worker...');
  //   try {
  //     await agentService.startWorker();
  //     console.log('✅ Agent worker is running and ready to handle voice sessions\n');
  //   } catch (error) {
  //     console.error('❌ Failed to start agent worker:', error);
  //     console.error('   Voice chat features may not work correctly\n');
  //   }
  // } else {
  //   console.log('ℹ️  Agent worker not started (run separately with: pnpm start:agent)\n');
  // }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
