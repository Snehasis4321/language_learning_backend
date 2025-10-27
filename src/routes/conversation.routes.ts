import { Router, Request, Response } from 'express';
import { liveKitService, sessionStore } from '../services/livekit.service';
import { cerebrasService } from '../services/cerebras.service';
import { deepgramService } from '../services/deepgram.service';
import { agentService } from '../services/agent.service';
import { UserService } from '../services/user.service';
import { StartConversationRequest, StartConversationResponse } from '../types/conversation';
import { config } from '../config/env';
import { optionalAppwriteAuth, AppwriteAuthRequest } from '../middleware/appwrite-auth.middleware';
import { AppwriteDatabaseService } from '../services/appwrite-db.service';
import { s3Service } from '../services/s3.service';

const router: Router = Router();

/**
 * POST /api/conversation/start
 * Start a new conversation session
 */
router.post('/start', optionalAppwriteAuth, async (req: AppwriteAuthRequest, res: Response): Promise<void> => {
  try {
    const request: StartConversationRequest = req.body;
    const userId = req.user?.uid || request.userId;

    // Create session
    const session = sessionStore.create(request);

    // Get personalized system prompt
    let customSystemPrompt: string | undefined;

    // Priority 1: Use userPreferences from request (from frontend localStorage)
    if (req.body.userPreferences) {
      console.log('📋 Received userPreferences:', JSON.stringify(req.body.userPreferences, null, 2));
      console.log('👤 Received userName:', req.body.userName);

      customSystemPrompt = UserService.generateSystemPromptFromPreferences(
        req.body.userPreferences,
        req.body.userName
      );
      console.log(`✨ Using personalized system prompt from localStorage${req.body.userName ? ` for ${req.body.userName}` : ''}`);
      console.log('📝 Generated system prompt length:', customSystemPrompt?.length, 'characters');
      console.log('📝 Generated system prompt preview:', customSystemPrompt?.substring(0, 200) + '...');
    }
    // Priority 2: Fallback to userId-based lookup (for authenticated users with saved profiles)
    else if (userId) {
      customSystemPrompt = UserService.getPersonalizedSystemPrompt(userId);
      console.log(`✨ Using personalized system prompt for user: ${userId}`);
    }

    // Save session to database only if user is authenticated (has Appwrite UID)
    if (req.user?.uid) {
      await AppwriteDatabaseService.createSession({
        id: session.id,
        user_id: req.user.uid,
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
      userName: req.body.userName,
      userPreferences: req.body.userPreferences,
      customSystemPrompt,
    });

    console.log('🏠 Room metadata being sent to agent:');
    console.log('   - difficulty:', session.difficulty);
    console.log('   - topic:', session.topic);
    console.log('   - userName:', req.body.userName);
    console.log('   - customSystemPrompt length:', customSystemPrompt?.length || 0);
    console.log('   - metadata size:', roomMetadata.length, 'bytes');

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
router.post('/:sessionId/end', optionalAppwriteAuth, async (req: AppwriteAuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const session = sessionStore.get(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // End session in database if it exists
    if (req.user) {
      await AppwriteDatabaseService.endSession(sessionId);
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
 * GET /api/conversation/messages
 * Get all messages for the authenticated user
 */
router.get('/messages', optionalAppwriteAuth, async (req: AppwriteAuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const messages = await AppwriteDatabaseService.getUserMessages(userId, limit);

    res.json({
      messages,
      count: messages.length,
      userId,
    });
  } catch (error) {
    console.error('Error getting user messages:', error);
    res.status(500).json({
      error: 'Failed to get user messages',
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
router.post('/test-cerebras', optionalAppwriteAuth, async (req: AppwriteAuthRequest, res: Response): Promise<void> => {
  try {
    const {
      message,
      difficulty = 'beginner',
      topic,
      history = [],
      userPreferences,
      userName
    } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Get user ID from authenticated user or from request body
    const userId = req.user?.uid || req.body.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
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

    // Create or get session for text chat
    // For text chat, we'll use a simple session ID based on user and date
    const sessionId = `text_${userId}_${new Date().toISOString().split('T')[0]}`;

    // Save user message to database
    try {
      const saveResult = await AppwriteDatabaseService.saveMessage({
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        content: message,
      });
      console.log(`💬 Saved user message to session: ${sessionId}`, saveResult);
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    // Save assistant message to database
    try {
      const saveResult = await AppwriteDatabaseService.saveMessage({
        session_id: sessionId,
        user_id: userId,
        role: 'assistant',
        content: result.response,
      });
      console.log(`💬 Saved assistant message to session: ${sessionId}`, saveResult);
    } catch (error) {
      console.error('Failed to save assistant message:', error);
    }

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
 * POST /api/conversation/tts-test
 * Simple test endpoint
 */
router.post('/tts-test', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🧪 Testing deepgram service...');
    const result = await deepgramService.testConnection();
    res.json({
      message: 'Deepgram service test',
      connection: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Deepgram service test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/conversation/tts
 * Generate text-to-speech audio with S3 caching
 */
router.post('/tts', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🎯 TTS request received:', { text: req.body.text?.substring(0, 50), voiceId: req.body.voiceId });

    const { text, voiceId } = req.body;

    if (!text) {
      console.log('❌ TTS request rejected: no text provided');
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    console.log('✅ TTS request validated, proceeding with generation');

    // Generate chat_id from text and voiceId
    const chatId = s3Service.generateChatId(text, voiceId);

    // Check if TTS cache exists
    const cachedTTS = await AppwriteDatabaseService.getTTSCache(chatId);

    if (cachedTTS) {
      console.log(`✅ TTS cache hit for chat_id: ${chatId}`);

      // Generate fresh presigned URL from cached S3 key
      const s3Key = cachedTTS.s3_key || s3Service.generateS3Key(chatId);
      const fileUrl = await s3Service.getPresignedUrl(s3Key, 3600); // 1 hour expiry
      console.log(`🔄 Generated fresh presigned URL for cached audio: ${fileUrl.substring(0, 100)}...`);

      // Redirect to file URL
      res.redirect(fileUrl);
      return;
    }

    // Cache miss - generate new TTS
    console.log(`🔊 TTS cache miss. Generating TTS for: "${text.substring(0, 50)}..."`);

    // Generate audio using Deepgram
    const audioBuffer = await deepgramService.generateSpeech(text, voiceId);

    // Upload to S3 for caching
    const s3Url = await s3Service.uploadAudio(chatId, audioBuffer);
    console.log(`✅ TTS uploaded to S3 successfully: ${s3Url}`);

    // Save to database for caching
    try {
      const s3Key = s3Service.generateS3Key(chatId);
      await AppwriteDatabaseService.saveTTSCache({
        chat_id: chatId,
        text,
        voice_id: voiceId,
        s3_url: s3Url, // Store presigned URL (will be regenerated on cache hits)
        s3_key: s3Key,
      });
      console.log(`💾 TTS cache saved to database: ${chatId}`);
    } catch (error) {
      console.error('Failed to save TTS cache to database:', error);
      // Continue anyway - S3 upload worked
    }

    // Redirect to S3 URL (same as cache hit behavior)
    console.log(`🔄 Redirecting to S3 URL: ${s3Url}`);
    res.redirect(s3Url);
    console.log('✅ Redirect sent to client');
  } catch (error) {
    console.error('Error generating TTS:', error);
    res.status(500).json({
      error: 'TTS generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
