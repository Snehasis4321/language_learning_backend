import { v4 as uuidv4 } from 'uuid';
import {
  UserProfile,
  CreateUserProfileRequest,
  UpdateUserPreferencesRequest,
  UserProgressStats,
} from '../types/user';

// In-memory storage (replace with database in production)
const users = new Map<string, UserProfile>();
const userProgress = new Map<string, UserProgressStats>();

export class UserService {
  /**
   * Create a new user profile
   */
  static createUserProfile(request: CreateUserProfileRequest): UserProfile {
    const userId = uuidv4();
    const now = new Date();

    const userProfile: UserProfile = {
      id: userId,
      name: request.name,
      email: request.email,
      createdAt: now,
      updatedAt: now,
      preferences: request.preferences,
    };

    users.set(userId, userProfile);

    // Initialize progress stats
    const progressStats: UserProgressStats = {
      userId,
      totalLearningMinutes: 0,
      conversationsCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      vocabularyLearned: 0,
      lastActiveDate: now,
      weeklyGoalProgress: 0,
    };
    userProgress.set(userId, progressStats);

    console.log('✅ Created user profile:', userId, 'Name:', request.name);
    return userProfile;
  }

  /**
   * Get user profile by ID
   */
  static getUserProfile(userId: string): UserProfile | undefined {
    return users.get(userId);
  }

  /**
   * Update user preferences
   */
  static updateUserPreferences(request: UpdateUserPreferencesRequest): UserProfile | null {
    const user = users.get(request.userId);
    if (!user) {
      console.error('❌ User not found:', request.userId);
      return null;
    }

    user.preferences = {
      ...user.preferences,
      ...request.preferences,
    };
    user.updatedAt = new Date();

    users.set(request.userId, user);
    console.log('✅ Updated preferences for user:', request.userId);
    return user;
  }

  /**
   * Get user progress statistics
   */
  static getUserProgress(userId: string): UserProgressStats | undefined {
    return userProgress.get(userId);
  }

  /**
   * Update user progress (called after each learning session)
   */
  static updateUserProgress(
    userId: string,
    minutesLearned: number,
    conversationCompleted: boolean = false
  ): UserProgressStats | null {
    const progress = userProgress.get(userId);
    if (!progress) {
      console.error('❌ User progress not found:', userId);
      return null;
    }

    const now = new Date();
    const lastActive = new Date(progress.lastActiveDate);

    // Update streak
    const daysSinceLastActive = Math.floor(
      (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastActive === 0) {
      // Same day, no change to streak
    } else if (daysSinceLastActive === 1) {
      // Consecutive day, increment streak
      progress.currentStreak += 1;
      if (progress.currentStreak > progress.longestStreak) {
        progress.longestStreak = progress.currentStreak;
      }
    } else {
      // Streak broken
      progress.currentStreak = 1;
    }

    // Update stats
    progress.totalLearningMinutes += minutesLearned;
    if (conversationCompleted) {
      progress.conversationsCompleted += 1;
    }
    progress.lastActiveDate = now;

    // Calculate weekly progress
    const user = users.get(userId);
    if (user) {
      const weeklyGoalMinutes = user.preferences.dailyGoalMinutes * 7;
      // This is simplified - you'd want to track actual weekly minutes
      progress.weeklyGoalProgress = Math.min(
        100,
        (progress.totalLearningMinutes / weeklyGoalMinutes) * 100
      );
    }

    userProgress.set(userId, progress);
    console.log('✅ Updated progress for user:', userId);
    return progress;
  }

  /**
   * Get all users (for admin purposes)
   */
  static getAllUsers(): UserProfile[] {
    return Array.from(users.values());
  }

  /**
   * Delete user profile
   */
  static deleteUserProfile(userId: string): boolean {
    const deleted = users.delete(userId);
    if (deleted) {
      userProgress.delete(userId);
      console.log('✅ Deleted user profile:', userId);
    }
    return deleted;
  }

  /**
   * Get personalized system prompt based on user preferences
   */
  static getPersonalizedSystemPrompt(userId: string): string {
    const user = users.get(userId);
    if (!user) {
      return this.getDefaultSystemPrompt();
    }

    const { preferences } = user;
    const userName = user.name;

    let prompt = `You are a friendly and patient AI language teacher helping ${userName} learn ${preferences.targetLanguage}. `;
    prompt += `${userName}'s native language is ${preferences.nativeLanguage}. `;
    prompt += `They are at a ${preferences.proficiencyLevel.replace(/_/g, ' ')} level.\n\n`;

    // Learning style
    if (preferences.learningStyle.length > 0) {
      prompt += `Learning Style: ${userName} prefers ${preferences.learningStyle.join(', ')} learning approaches. `;
      prompt += `Adapt your teaching to match these preferences.\n\n`;
    }

    // Focus areas
    if (preferences.focusAreas.length > 0) {
      prompt += `Focus Areas: Pay special attention to ${preferences.focusAreas.join(', ')}. `;
      prompt += `Help ${userName} improve in these areas during conversations.\n\n`;
    }

    // Topics of interest
    if (preferences.topicsOfInterest.length > 0) {
      prompt += `Topics of Interest: ${userName} is interested in topics like: ${preferences.topicsOfInterest.join(', ')}. `;
      prompt += `Try to incorporate these topics into your conversations when appropriate.\n\n`;
    }

    // Learning goals
    if (preferences.learningGoals.length > 0) {
      const goals = preferences.learningGoals.map((g) => g.replace(/_/g, ' ')).join(', ');
      prompt += `Learning Goals: ${userName} wants to learn ${preferences.targetLanguage} for: ${goals}. `;
      prompt += `Keep these goals in mind when providing exercises and practice.\n\n`;
    }

    // Correction style
    prompt += `Correction Style: `;
    switch (preferences.correctionStyle) {
      case 'immediate':
        prompt += `Correct mistakes immediately during the conversation. `;
        break;
      case 'end_of_conversation':
        prompt += `Take note of mistakes but provide corrections at the end of the conversation. `;
        break;
      case 'gentle':
        prompt += `Provide gentle hints without explicitly pointing out mistakes. `;
        break;
      case 'detailed':
        prompt += `Provide detailed explanations when correcting mistakes. `;
        break;
    }
    prompt += `\n\n`;

    // Voice speed
    prompt += `Speaking Style: `;
    switch (preferences.preferredVoiceSpeed) {
      case 'very_slow':
        prompt += `Speak very slowly and clearly, as ${userName} is still building listening skills. `;
        break;
      case 'slow':
        prompt += `Speak slowly and enunciate clearly. `;
        break;
      case 'normal':
        prompt += `Speak at a normal, conversational pace. `;
        break;
      case 'fast':
        prompt += `Speak at a natural, native speaker pace. `;
        break;
    }
    prompt += `\n\n`;

    prompt += `Remember to be encouraging, patient, and supportive. Make learning fun and engaging!`;

    return prompt;
  }

  /**
   * Default system prompt when no user profile exists
   */
  private static getDefaultSystemPrompt(): string {
    return `You are a friendly and patient AI language teacher. Help the student learn through natural conversation, provide gentle corrections, and make learning enjoyable.`;
  }
}
