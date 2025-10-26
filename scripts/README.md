# Setup Scripts

## setup-appwrite.ts

This script automatically creates the complete Appwrite database schema for the language learning application.

### What it creates:

- **Database**: `language_learning_db`
- **Collections** (7 total):
  - `users` - User accounts
  - `user_profiles` - User learning preferences
  - `sessions` - Voice conversation sessions
  - `messages` - Chat messages
  - `user_progress` - Learning progress tracking
  - `saved_vocabulary` - User's saved words/phrases
  - `tts_cache` - Text-to-speech audio cache

### Prerequisites:

1. Appwrite server running
2. Project created in Appwrite Console
3. API key with admin permissions created

### Environment Variables Required:

```bash
APPWRITE_ENDPOINT=http://localhost/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-admin-api-key
APPWRITE_DATABASE_ID=language_learning_db
```

### Usage:

```bash
cd language_learning_backend
pnpm setup:appwrite
```

### What happens:

1. Creates the database if it doesn't exist
2. Creates all collections with proper permissions
3. Adds all required attributes to each collection
4. Handles conflicts gracefully (skips existing resources)

### Next Steps:

After running this script, you still need to:
1. Create the `tts_cache` storage bucket manually in Appwrite Console
2. Update your `.env` file with the credentials
3. Test your application

### Safety:

- The script checks for existing resources and skips them
- No data is deleted or overwritten
- Safe to run multiple times