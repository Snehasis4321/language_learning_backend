import { Request, Response, NextFunction } from 'express';
import { AppwriteAuthService } from '../services/appwrite-auth.service';

export interface AppwriteAuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    displayName?: string;
  };
}

/**
 * Middleware to verify Appwrite JWT token
 * Expects Authorization header with format: "Bearer <token>"
 */
export const verifyAppwriteToken = async (
  req: AppwriteAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the token with Appwrite Auth Service
    const user = await AppwriteAuthService.verifyToken(token);

    // Attach user info to request
    req.user = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    };

    next();
  } catch (error) {
    console.error('Appwrite auth middleware error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
};

/**
 * Optional auth middleware - doesn't block if no token
 * Useful for endpoints that work with or without auth
 */
export const optionalAppwriteAuth = async (
  req: AppwriteAuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const user = await AppwriteAuthService.verifyToken(token);

      req.user = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    console.warn('Optional Appwrite auth failed:', error);
    next();
  }
};