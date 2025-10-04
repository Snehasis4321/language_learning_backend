export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  // Target language learning
  targetLanguage: string; // e.g., 'Spanish', 'French', 'German', etc.
  nativeLanguage: string; // User's native language
  proficiencyLevel: ProficiencyLevel;

  // Learning style preferences
  learningStyle: LearningStyle[];

  // Time commitment
  dailyGoalMinutes: number; // Daily learning goal in minutes
  availableDays: WeekDay[]; // Days available for learning
  preferredTimeOfDay: TimeOfDay[];

  // Learning goals and motivations
  learningGoals: LearningGoal[];
  motivation: string; // Free text: why they want to learn

  // Practice preferences
  focusAreas: FocusArea[]; // What aspects to focus on
  topicsOfInterest: string[]; // Topics they want to practice

  // Voice/interaction preferences
  preferredVoiceSpeed: VoiceSpeed;
  correctionStyle: CorrectionStyle;
}

export type ProficiencyLevel =
  | 'absolute_beginner'
  | 'beginner'
  | 'elementary'
  | 'intermediate'
  | 'upper_intermediate'
  | 'advanced'
  | 'proficient';

export type LearningStyle =
  | 'visual' // Learning through images, diagrams, charts
  | 'auditory' // Learning through listening
  | 'kinesthetic' // Learning through practice and doing
  | 'reading_writing' // Learning through reading and writing
  | 'conversational' // Learning through conversation
  | 'structured' // Prefer structured lessons
  | 'immersive'; // Prefer immersive practice

export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type TimeOfDay =
  | 'early_morning' // 5am-9am
  | 'morning' // 9am-12pm
  | 'afternoon' // 12pm-5pm
  | 'evening' // 5pm-9pm
  | 'night'; // 9pm-12am

export type LearningGoal =
  | 'travel' // Traveling to countries
  | 'work' // Professional/career advancement
  | 'education' // Academic purposes
  | 'cultural' // Cultural appreciation
  | 'family' // Communicate with family
  | 'social' // Making friends
  | 'relocation' // Moving to another country
  | 'hobby' // Personal interest/hobby
  | 'test_preparation'; // Preparing for language test

export type FocusArea =
  | 'speaking' // Conversational fluency
  | 'listening' // Comprehension
  | 'reading' // Reading comprehension
  | 'writing' // Written expression
  | 'grammar' // Grammar rules
  | 'vocabulary' // Vocabulary building
  | 'pronunciation'; // Accent and pronunciation

export type VoiceSpeed =
  | 'very_slow'
  | 'slow'
  | 'normal'
  | 'fast';

export type CorrectionStyle =
  | 'immediate' // Correct immediately during conversation
  | 'end_of_conversation' // Provide corrections at the end
  | 'gentle' // Gentle hints without explicit correction
  | 'detailed'; // Detailed explanations of mistakes

export interface CreateUserProfileRequest {
  name: string;
  email?: string;
  preferences: UserPreferences;
}

export interface UpdateUserPreferencesRequest {
  userId: string;
  preferences: Partial<UserPreferences>;
}

export interface UserProgressStats {
  userId: string;
  totalLearningMinutes: number;
  conversationsCompleted: number;
  currentStreak: number; // Days in a row
  longestStreak: number;
  vocabularyLearned: number;
  lastActiveDate: Date;
  weeklyGoalProgress: number; // Percentage
}
