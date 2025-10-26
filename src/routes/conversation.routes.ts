import { Router, Request, Response } from 'express';
import { liveKitService, sessionStore } from '../services/livekit.service';
import { cerebrasService } from '../services/cerebras.service';
import { cartesiaService } from '../services/cartesia.service';
import { agentService } from '../services/agent.service';
import { UserService } from '../services/user.service';
import { StartConversationRequest, StartConversationResponse } from '../types/conversation';
import { config } from '../config/env';
import { optionalAppwriteAuth, AppwriteAuthRequest } from '../middleware/appwrite-auth.middleware';
import { AppwriteDatabaseService } from '../services/appwrite-db.service';
import { AppwriteStorageService } from '../services/appwrite-storage.service';

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
    const chatId = AppwriteStorageService.generateChatId(text, voiceId);

    // Check if TTS cache exists
    const cachedTTS = await AppwriteDatabaseService.getTTSCache(chatId);

    if (cachedTTS) {
      console.log(`✅ TTS cache hit for chat_id: ${chatId}`);

      // Generate file URL for the cached audio
      const fileUrl = AppwriteStorageService.getFileUrl(cachedTTS.appwrite_file_id);

      // Redirect to file URL
      res.redirect(fileUrl);
      return;
    }

    // Cache miss - generate new TTS
    console.log(`🔊 TTS cache miss. Generating TTS for: "${text.substring(0, 50)}..."`);

    // Generate audio using Cartesia
    const audioBuffer = await cartesiaService.generateSpeech(text, voiceId);

    // Upload to Appwrite Storage
    await AppwriteStorageService.uploadAudio(chatId, audioBuffer);

    // Save to database
    await AppwriteDatabaseService.saveTTSCache({
      chat_id: chatId,
      text,
      voice_id: voiceId,
      appwrite_file_id: chatId, // Using chatId as file ID for simplicity
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
