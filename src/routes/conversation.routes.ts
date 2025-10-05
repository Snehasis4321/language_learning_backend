import { Router, Request, Response } from 'express';
import { liveKitService, sessionStore } from '../services/livekit.service';
import { cerebrasService } from '../services/cerebras.service';
import { cartesiaService } from '../services/cartesia.service';
import { agentService } from '../services/agent.service';
import { UserService } from '../services/user.service';
import { StartConversationRequest, StartConversationResponse } from '../types/conversation';
import { config } from '../config/env';
import { optionalAuth, AuthRequest } from '../middleware/auth.middleware';
import { dbService } from '../services/db.service';
import { s3Service } from '../services/s3.service';

const router: Router = Router();

/**
 * POST /api/conversation/start
 * Start a new conversation session
 */
router.post('/start', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request: StartConversationRequest = req.body;
    const userId = req.user?.uid || request.userId;

    // Create session
    const session = sessionStore.create(request);

    // Get personalized system prompt if userId is provided
    let customSystemPrompt: string | undefined;
    if (userId) {
      customSystemPrompt = UserService.getPersonalizedSystemPrompt(userId);
      console.log(`✨ Using personalized system prompt for user: ${userId}`);
    }

    // Save session to database if user is authenticated
    if (userId) {
      await dbService.createSession({
        id: session.id,
        user_id: userId,
        difficulty: session.difficulty,
        topic: session.topic,
        room_name: session.roomName,
      });
    }

    // Prepare metadata for the room (agent will read this)
    const roomMetadata = JSON.stringify({
      difficulty: session.difficulty,
      topic: session.topic,
      userId: userId,
      customSystemPrompt,
    });

    // Create LiveKit room with metadata
    await liveKitService.createRoom(session.roomName, roomMetadata);

    // Generate token for user
    const userToken = await liveKitService.generateToken(
      session.roomName,
      userId || 'user'
    );

    // Notify agent service about the session
    await agentService.notifySessionStart(
      session.roomName,
      session.difficulty,
      session.topic,
      customSystemPrompt
    );

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
router.post('/:sessionId/end', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const session = sessionStore.get(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // End session in database if it exists
    if (req.user) {
      await dbService.endSession(sessionId);
    }

    // Mark session as ended
    sessionStore.end(sessionId);

    // Notify agent service about session end
    await agentService.notifySessionEnd(session.roomName);

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
 * Test Cerebras API connection with conversation memory
 */
router.post('/test-cerebras', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      message,
      difficulty = 'beginner',
      topic,
      history = [],
      userId,
      userPreferences,
      userName
    } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Generate personalized system prompt from userPreferences (sent from frontend)
    let customSystemPrompt: string | undefined;
    if (userPreferences) {
      customSystemPrompt = UserService.generateSystemPromptFromPreferences(
        userPreferences,
        userName
      );
      console.log(`✨ Using personalized system prompt${userName ? ` for ${userName}` : ''}`);
    }

    // Compact conversation history if it gets too long (>20 messages = 10 exchanges)
    let conversationHistory = history;
    if (history.length > 10) {
      console.log(`Compacting conversation history from ${history.length} messages...`);
      conversationHistory = await cerebrasService.compactConversation(
        history,
        difficulty,
        topic,
        10 // Keep last 10 messages
      );
      console.log(`Compacted to ${conversationHistory.length} messages`);
    }

    // Generate response with conversation history and optional custom prompt
    const result = await cerebrasService.generateResponse(
      message,
      conversationHistory,
      difficulty,
      topic,
      customSystemPrompt
    );

    // Build updated history for frontend
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: result.response },
    ];

    res.json({
      success: true,
      userMessage: message,
      aiResponse: result.response,
      difficulty,
      topic,
      history: updatedHistory,
      compacted: history.length > 10,
      tokenUsage: result.tokenUsage,
      personalizedPrompt: !!customSystemPrompt,
    });
  } catch (error) {
    console.error('Error testing Cerebras:', error);
    res.status(500).json({
      error: 'Cerebras test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/conversation/tts
 * Generate text-to-speech audio with S3 caching
 */
router.post('/tts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    // Generate chat_id from text and voiceId
    const chatId = s3Service.generateChatId(text, voiceId);

    // Check if TTS cache exists
    const cachedTTS = await dbService.getTTSCache(chatId);

    if (cachedTTS) {
      console.log(`✅ TTS cache hit for chat_id: ${chatId}`);

      // Generate presigned URL for the cached audio
      const s3Key = s3Service.extractS3Key(cachedTTS.s3_url);
      const presignedUrl = await s3Service.getPresignedUrl(s3Key, 3600); // 1 hour expiry

      // Redirect to presigned URL
      res.redirect(presignedUrl);
      return;
    }

    // Cache miss - generate new TTS
    console.log(`🔊 TTS cache miss. Generating TTS for: "${text.substring(0, 50)}..."`);

    // Generate audio using Cartesia
    const audioBuffer = await cartesiaService.generateSpeech(text, voiceId);

    // Upload to S3
    const s3Url = await s3Service.uploadAudio(chatId, audioBuffer);
    const s3Key = s3Service.generateS3Key(chatId);

    // Save to database
    await dbService.saveTTSCache({
      chat_id: chatId,
      text,
      voice_id: voiceId,
      s3_url: s3Url,
      s3_key: s3Key,
    });

    console.log(`✅ TTS cached successfully with chat_id: ${chatId}`);

    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Send audio data
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating TTS:', error);
    res.status(500).json({
      error: 'TTS generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
