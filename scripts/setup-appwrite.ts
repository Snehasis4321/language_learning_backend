import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'http://localhost/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'language_learning_db';

const headers = {
  'X-Appwrite-Project': APPWRITE_PROJECT_ID,
  'X-Appwrite-Key': APPWRITE_API_KEY,
  'Content-Type': 'application/json',
};

async function makeRequest(method: 'POST' | 'GET', url: string, data?: any) {
  try {
    const response = await axios({
      method,
      url: `${APPWRITE_ENDPOINT}${url}`,
      headers,
      data,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      // Resource already exists
      return null;
    }
    throw error;
  }
}

async function createDatabase() {
  try {
    console.log('Checking database...');
    // Try to get the database to see if it exists
    await makeRequest('GET', `/databases/${DATABASE_ID}`);
    console.log('ℹ️ Database already exists');
  } catch (error: any) {
    if (error.response?.status === 404) {
      // Database doesn't exist, try to create it
      try {
        console.log('Creating database...');
        await makeRequest('POST', `/databases`, {
          databaseId: DATABASE_ID,
          name: 'Language Learning Database',
        });
        console.log('✅ Database created successfully');
      } catch (createError: any) {
        if (createError.response?.status === 403) {
          console.log('⚠️ Database creation blocked by plan limits, but database may already exist');
          console.log('ℹ️ Proceeding with collection creation...');
        } else {
          console.error('❌ Failed to create database:', createError.response?.data || createError.message);
          throw createError;
        }
      }
    } else {
      console.error('❌ Failed to check database:', error.response?.data || error.message);
      throw error;
    }
  }
}

async function createCollection(collectionId: string, name: string) {
  try {
    console.log(`Creating collection: ${name}...`);
    await makeRequest('POST', `/databases/${DATABASE_ID}/collections`, {
      collectionId,
      name,
      permissions: [
        'read("any")',
        'write("users")',
      ],
    });
    console.log(`✅ Collection '${name}' created successfully`);
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`ℹ️ Collection '${name}' already exists`);
    } else {
      console.error(`❌ Failed to create collection '${name}':`, error.response?.data || error.message);
      throw error;
    }
  }
}

async function createStringAttribute(collectionId: string, key: string, size: number, required: boolean = false, array: boolean = false) {
  try {
    console.log(`Creating ${array ? 'array ' : ''}string attribute: ${key}...`);
    await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/string`, {
      key,
      size,
      required,
      array,
    });
    console.log(`✅ ${array ? 'Array ' : ''}String attribute '${key}' created`);
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`ℹ️ ${array ? 'Array ' : ''}String attribute '${key}' already exists`);
    } else {
      console.error(`❌ Failed to create ${array ? 'array ' : ''}string attribute '${key}':`, error.response?.data || error.message);
      throw error;
    }
  }
}

async function createEnumAttribute(collectionId: string, key: string, elements: string[], required: boolean = false) {
  try {
    console.log(`Creating enum attribute: ${key}...`);
    await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/enum`, {
      key,
      elements,
      required,
    });
    console.log(`✅ Enum attribute '${key}' created`);
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`ℹ️ Enum attribute '${key}' already exists`);
    } else {
      console.error(`❌ Failed to create enum attribute '${key}':`, error.response?.data || error.message);
      throw error;
    }
  }
}

async function createDatetimeAttribute(collectionId: string, key: string, required: boolean = false) {
  try {
    console.log(`Creating datetime attribute: ${key}...`);
    await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/datetime`, {
      key,
      required,
    });
    console.log(`✅ Datetime attribute '${key}' created`);
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`ℹ️ Datetime attribute '${key}' already exists`);
    } else {
      console.error(`❌ Failed to create datetime attribute '${key}':`, error.response?.data || error.message);
      throw error;
    }
  }
}

async function createIntegerAttribute(collectionId: string, key: string, required: boolean = false) {
  try {
    console.log(`Creating integer attribute: ${key}...`);
    await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/integer`, {
      key,
      required,
    });
    console.log(`✅ Integer attribute '${key}' created`);
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`ℹ️ Integer attribute '${key}' already exists`);
    } else {
      console.error(`❌ Failed to create integer attribute '${key}':`, error.response?.data || error.message);
      throw error;
    }
  }
}

async function createFloatAttribute(collectionId: string, key: string, required: boolean = false) {
  try {
    console.log(`Creating float attribute: ${key}...`);
    await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/float`, {
      key,
      required,
    });
    console.log(`✅ Float attribute '${key}' created`);
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`ℹ️ Float attribute '${key}' already exists`);
    } else {
      console.error(`❌ Failed to create float attribute '${key}':`, error.response?.data || error.message);
      throw error;
    }
  }
}

async function setupCollections() {
  try {
    console.log('🚀 Starting Appwrite database setup...\n');

    // Validate environment variables
    if (!APPWRITE_API_KEY) {
      throw new Error('APPWRITE_API_KEY environment variable is required');
    }
    if (!APPWRITE_PROJECT_ID) {
      throw new Error('APPWRITE_PROJECT_ID environment variable is required');
    }

    // Create database
    await createDatabase();

    // Create collections and their attributes
    console.log('\n📋 Creating collections...\n');

    // Users collection
    await createCollection('users', 'Users');
    await createStringAttribute('users', 'email', 254, true);
    await createStringAttribute('users', 'display_name', 100, false);
    await createDatetimeAttribute('users', 'created_at', true);
    await createDatetimeAttribute('users', 'updated_at', true);

    // User Profiles collection
    await createCollection('user_profiles', 'User Profiles');
    await createStringAttribute('user_profiles', 'user_id', 50, true);
    await createStringAttribute('user_profiles', 'native_language', 50, false);
    await createStringAttribute('user_profiles', 'target_language', 50, false);
    await createEnumAttribute('user_profiles', 'proficiency_level', ['beginner', 'intermediate', 'advanced'], false);
    await createStringAttribute('user_profiles', 'learning_goals', 500, false, true);
    await createStringAttribute('user_profiles', 'preferred_topics', 500, false, true);
    await createStringAttribute('user_profiles', 'custom_system_prompt', 1000, false);
    await createDatetimeAttribute('user_profiles', 'created_at', true);
    await createDatetimeAttribute('user_profiles', 'updated_at', true);

    // Sessions collection
    await createCollection('sessions', 'Sessions');
    await createStringAttribute('sessions', 'user_id', 50, true);
    await createStringAttribute('sessions', 'difficulty', 50, false);
    await createStringAttribute('sessions', 'topic', 100, false);
    await createStringAttribute('sessions', 'room_name', 100, false);
    await createDatetimeAttribute('sessions', 'started_at', true);
    await createDatetimeAttribute('sessions', 'ended_at', false);
    await createIntegerAttribute('sessions', 'duration_seconds', false);
    await createEnumAttribute('sessions', 'status', ['active', 'completed', 'abandoned'], true);

    // Messages collection
    await createCollection('messages', 'Messages');
    await createStringAttribute('messages', 'session_id', 50, true);
    await createEnumAttribute('messages', 'role', ['user', 'assistant'], true);
    await createStringAttribute('messages', 'content', 10000, true);
    await createDatetimeAttribute('messages', 'created_at', true);

    // User Progress collection
    await createCollection('user_progress', 'User Progress');
    await createStringAttribute('user_progress', 'user_id', 50, true);
    await createStringAttribute('user_progress', 'session_id', 50, false);
    await createStringAttribute('user_progress', 'metric_type', 100, true);
    await createFloatAttribute('user_progress', 'metric_value', true);
    await createDatetimeAttribute('user_progress', 'recorded_at', true);

    // Saved Vocabulary collection
    await createCollection('saved_vocabulary', 'Saved Vocabulary');
    await createStringAttribute('saved_vocabulary', 'user_id', 50, true);
    await createStringAttribute('saved_vocabulary', 'word_or_phrase', 200, true);
    await createStringAttribute('saved_vocabulary', 'translation', 200, false);
    await createStringAttribute('saved_vocabulary', 'context', 500, false);
    await createStringAttribute('saved_vocabulary', 'difficulty_level', 50, false);
    await createDatetimeAttribute('saved_vocabulary', 'created_at', true);

    // TTS Cache collection
    await createCollection('tts_cache', 'TTS Cache');
    await createStringAttribute('tts_cache', 'chat_id', 50, true);
    await createStringAttribute('tts_cache', 'text', 10000, true);
    await createStringAttribute('tts_cache', 'voice_id', 50, false);
    await createStringAttribute('tts_cache', 'appwrite_file_id', 50, true);
    await createDatetimeAttribute('tts_cache', 'created_at', true);
    await createDatetimeAttribute('tts_cache', 'last_accessed_at', true);

    console.log('\n🎉 Appwrite database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Create the storage bucket "tts_cache" in Appwrite Console');
    console.log('2. Update your .env file with the correct credentials');
    console.log('3. Test your application');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupCollections();