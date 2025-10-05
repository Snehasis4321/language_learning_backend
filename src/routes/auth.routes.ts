import { Router, Response } from 'express';
import { verifyFirebaseToken, AuthRequest } from '../middleware/auth.middleware';
import { dbService } from '../services/db.service';

const router: Router = Router();

/**
 * POST /api/auth/sync-user
 * Sync Firebase user to database
 */
router.post('/sync-user', verifyFirebaseToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await dbService.createUser({
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
router.get('/me', verifyFirebaseToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await dbService.getUserById(req.user.uid);
    const profile = await dbService.getProfileByUserId(req.user.uid);

    res.json({
      user,
      profile,
      firebaseUser: req.user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
