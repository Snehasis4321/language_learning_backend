import { Client, Users, Databases, Storage } from 'node-appwrite';

// Initialize Appwrite client
const initializeAppwrite = () => {
  const client = new Client();

  // Configure Appwrite client
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://localhost/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

  const users = new Users(client);
  const databases = new Databases(client);
  const storage = new Storage(client);

  console.log('✅ Appwrite client initialized');

  return { client, users, databases, storage };
};

export const appwrite = initializeAppwrite();
export const { client, users, databases, storage } = appwrite;