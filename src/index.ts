import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import path from 'path';
import { config, validateEnv } from './config/env';
import conversationRoutes from './routes/conversation.routes';
import { cerebrasService } from './services/cerebras.service';
import { liveKitService } from './services/livekit.service';
import { cartesiaService } from './services/cartesia.service';

// Validate environment variables
validateEnv();

const app: Express = express();

// Middleware
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
    const cartesiaConnected = await cartesiaService.testConnection();

    res.json({
      status: 'operational',
      services: {
        cerebras: cerebrasConnected ? 'connected' : 'disconnected',
        livekit: liveKitConnected ? 'connected' : 'disconnected',
        cartesia: cartesiaConnected ? 'connected' : 'disconnected',
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
app.use('/api/conversation', conversationRoutes);

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

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Language Learning Backend Server`);
  console.log('='.repeat(50));
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Status check: http://localhost:${PORT}/status`);
  console.log('='.repeat(50));
  console.log('\n📋 Available endpoints:');
  console.log('  POST   /api/conversation/start');
  console.log('  POST   /api/conversation/:id/end');
  console.log('  GET    /api/conversation/:id');
  console.log('  GET    /api/conversation/sessions/active');
  console.log('  POST   /api/conversation/test-cerebras');
  console.log('\n🧪 Test Pages:');
  console.log(`  Voice Test: http://localhost:${PORT}/test-voice.html`);
  console.log('\n✨ Server is ready to accept requests!\n');
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
