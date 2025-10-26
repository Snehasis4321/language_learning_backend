import { Router, Response } from 'express';
import { verifyAppwriteToken, AppwriteAuthRequest } from '../middleware/appwrite-auth.middleware';
import { AppwriteDatabaseService } from '../services/appwrite-db.service';

const router: Router = Router();

/**
 * POST /api/auth/sync-user
 * Sync Appwrite user to database
 */
router.post('/sync-user', verifyAppwriteToken, async (req: AppwriteAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await AppwriteDatabaseService.createUser({
      id: req.user.uid,
      email: req.user.email || '',
      display_name: req.user.displayName,
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', verifyAppwriteToken, async (req: AppwriteAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await AppwriteDatabaseService.getUserById(req.user.uid);
    const profile = await AppwriteDatabaseService.getProfileByUserId(req.user.uid);

    res.json({
      user,
      profile,
      appwriteUser: req.user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /api/auth/register
 * Register a new user (for server-side user creation)
 */
router.post('/register', async (req: AppwriteAuthRequest, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Note: In production, user registration should be done client-side
    // This endpoint is for admin purposes or specific use cases
    const user = await AppwriteDatabaseService.createUser({
      id: `user_${Date.now()}`, // Generate temporary ID
      email,
      display_name: name,
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Register user error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

export default router;