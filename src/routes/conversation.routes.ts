import { Router, Request, Response } from 'express';
import { liveKitService, sessionStore } from '../services/livekit.service';
import { cerebrasService } from '../services/cerebras.service';
import { StartConversationRequest, StartConversationResponse } from '../types/conversation';
import { config } from '../config/env';

const router: Router = Router();

/**
 * POST /api/conversation/start
 * Start a new conversation session
 */
router.post('/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: StartConversationRequest = req.body;

    // Create session
    const session = sessionStore.create(request);

    // Create LiveKit room
    await liveKitService.createRoom(session.roomName);

    // Generate token for user
    const userToken = await liveKitService.generateToken(
      session.roomName,
      request.userId || 'user',
      JSON.stringify({
        difficulty: session.difficulty,
        topic: session.topic,
      })
    );

    // TODO: Spawn AI agent (will implement in next step)
    // For now, we'll just return the room info for manual testing

    const response: StartConversationResponse = {
      sessionId: session.id,
      roomName: session.roomName,
      token: userToken,
      url: config.livekit.url,
    };

    res.json(response);
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      error: 'Failed to start conversation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/conversation/:sessionId/end
 * End a conversation session
 */
router.post('/:sessionId/end', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const session = sessionStore.get(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Mark session as ended
    sessionStore.end(sessionId);

    // Delete the room
    await liveKitService.deleteRoom(session.roomName);

    res.json({
      message: 'Session ended successfully',
      sessionId,
      duration:
        session.endedAt && session.createdAt
          ? Math.floor((session.endedAt.getTime() - session.createdAt.getTime()) / 1000)
          : 0,
    });
  } catch (error) {
    console.error('Error ending conversation:', error);
    res.status(500).json({
      error: 'Failed to end conversation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/conversation/:sessionId
 * Get session details
 */
router.get('/:sessionId', (req: Request, res: Response): void => {
  try {
    const { sessionId } = req.params;
    const session = sessionStore.get(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({
      error: 'Failed to get session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/conversation/active
 * List all active sessions
 */
router.get('/sessions/active', async (_req: Request, res: Response): Promise<void> => {
  try {
    const sessions = sessionStore.getAll().filter(s => !s.endedAt);
    res.json({ sessions, count: sessions.length });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({
      error: 'Failed to list sessions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/conversation/test-cerebras
 * Test Cerebras API connection
 */
router.post('/test-cerebras', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, difficulty = 'beginner', topic } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const response = await cerebrasService.generateResponse(message, [], difficulty, topic);

    res.json({
      success: true,
      userMessage: message,
      aiResponse: response,
      difficulty,
      topic,
    });
  } catch (error) {
    console.error('Error testing Cerebras:', error);
    res.status(500).json({
      error: 'Cerebras test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
