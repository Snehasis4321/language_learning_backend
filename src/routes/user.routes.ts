import express, { Request, Response, Router } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserProfileRequest, UpdateUserPreferencesRequest } from '../types/user';

const router: Router = express.Router();

/**
 * POST /api/users/profile
 * Create a new user profile
 */
router.post('/profile', (req: Request, res: Response) => {
  try {
    const request: CreateUserProfileRequest = req.body;

    // Validate required fields
    if (!request.name || !request.preferences) {
      res.status(400).json({
        error: 'Missing required fields: name and preferences',
      });
      return;
    }

    const userProfile = UserService.createUserProfile(request);

    res.status(201).json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    res.status(500).json({
      error: 'Failed to create user profile',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/profile/:userId
 * Get user profile by ID
 */
router.get('/profile/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userProfile = UserService.getUserProfile(userId);

    if (!userProfile) {
      res.status(404).json({
        error: 'User profile not found',
      });
      return;
    }

    res.json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/users/preferences
 * Update user preferences
 */
router.put('/preferences', (req: Request, res: Response) => {
  try {
    const request: UpdateUserPreferencesRequest = req.body;

    if (!request.userId || !request.preferences) {
      res.status(400).json({
        error: 'Missing required fields: userId and preferences',
      });
      return;
    }

    const userProfile = UserService.updateUserPreferences(request);

    if (!userProfile) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      error: 'Failed to update user preferences',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/progress/:userId
 * Get user progress statistics
 */
router.get('/progress/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const progress = UserService.getUserProgress(userId);

    if (!progress) {
      res.status(404).json({
        error: 'User progress not found',
      });
      return;
    }

    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({
      error: 'Failed to fetch user progress',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/users/progress/:userId
 * Update user progress after a learning session
 */
router.post('/progress/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { minutesLearned, conversationCompleted } = req.body;

    if (typeof minutesLearned !== 'number') {
      res.status(400).json({
        error: 'Missing or invalid field: minutesLearned (number required)',
      });
      return;
    }

    const progress = UserService.updateUserProgress(
      userId,
      minutesLearned,
      conversationCompleted || false
    );

    if (!progress) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('Error updating user progress:', error);
    res.status(500).json({
      error: 'Failed to update user progress',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/system-prompt/:userId
 * Get personalized system prompt for the user
 */
router.get('/system-prompt/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const systemPrompt = UserService.getPersonalizedSystemPrompt(userId);

    res.json({
      success: true,
      systemPrompt,
    });
  } catch (error) {
    console.error('Error generating system prompt:', error);
    res.status(500).json({
      error: 'Failed to generate system prompt',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
