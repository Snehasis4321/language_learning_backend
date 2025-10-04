import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (admin.apps.length === 0) {
    try {
      const configString = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!configString) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
      }

      // Parse service account from JSON string
      const serviceAccount = JSON.parse(configString);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log('✅ Firebase Admin initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
      throw new Error('Invalid Firebase service account configuration');
    }
  }
  return admin;
};

export const firebaseAdmin = initializeFirebase();
export const auth = firebaseAdmin.auth();
