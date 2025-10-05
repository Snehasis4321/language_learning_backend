import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    displayName?: string;
  };
}

/**
 * Middleware to verify Firebase Auth token
 * Expects Authorization header with format: "Bearer <token>"
 */
export const verifyFirebaseToken = async (
  req: AuthRequest,
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

    // Verify the token with Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
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
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(token);

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
      };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    console.warn('Optional auth failed:', error);
    next();
  }
};
