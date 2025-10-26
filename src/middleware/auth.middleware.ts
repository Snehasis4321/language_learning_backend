// COMMENTED OUT - Firebase Auth Middleware (keeping for reference)
// Migrated to Appwrite Auth - see src/middleware/appwrite-auth.middleware.ts

// Legacy Firebase auth interfaces and functions - no longer used
export interface AuthRequest {
  user?: {
    uid: string;
    email?: string;
    displayName?: string;
  };
}

// These functions are no longer used - replaced by Appwrite auth
export const verifyFirebaseToken = () => {
  throw new Error('Firebase auth has been migrated to Appwrite');
};

export const optionalAuth = () => {
  throw new Error('Firebase auth has been migrated to Appwrite');
};