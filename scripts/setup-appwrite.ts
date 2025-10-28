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

async function createIndex(collectionId: string, key: string, type: string, attributes: string[], orders?: string[]) {
  try {
    console.log(`Creating index: ${key}...`);
    await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/indexes`, {
      key,
      type,
      attributes,
      orders,
    });
    console.log(`✅ Index '${key}' created`);
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`ℹ️ Index '${key}' already exists`);
    } else {
      console.error(`❌ Failed to create index '${key}':`, error.response?.data || error.message);
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

    // TTS Cache collection (only create this one for now)
    await createCollection('tts_cache', 'TTS Cache');
    await createStringAttribute('tts_cache', 'chat_id', 50, true);
    await createStringAttribute('tts_cache', 'text', 10000, true);
    await createStringAttribute('tts_cache', 'voice_id', 50, false);
    await createStringAttribute('tts_cache', 's3_url', 500, true);
    await createStringAttribute('tts_cache', 's3_key', 200, true);
    await createDatetimeAttribute('tts_cache', 'created_at', true);
    await createDatetimeAttribute('tts_cache', 'last_accessed_at', true);

    console.log('\n🎉 Appwrite TTS Cache collection setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Ensure your S3 bucket is configured and accessible');
    console.log('2. Update your .env file with the correct credentials');
    console.log('3. Test your application');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupCollections();