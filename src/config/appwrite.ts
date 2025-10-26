import { Client, Account, Databases, Storage } from 'appwrite';

// Initialize Appwrite client
const initializeAppwrite = () => {
  const client = new Client();

  // Configure Appwrite client
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://localhost/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '');

  const account = new Account(client);
  const databases = new Databases(client);
  const storage = new Storage(client);

  console.log('✅ Appwrite client initialized');

  return { client, account, databases, storage };
};

export const appwrite = initializeAppwrite();
export const { client, account, databases, storage } = appwrite;