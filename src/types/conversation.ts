export interface ConversationSession {
  id: string;
  roomName: string;
  userId?: string;
  type: ConversationType;
  topic?: string;
  difficulty: DifficultyLevel;
  createdAt: Date;
  endedAt?: Date;
}

export type ConversationType = 'practice' | 'free' | 'roleplay' | 'scenario';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface StartConversationRequest {
  type?: ConversationType;
  topic?: string;
  difficulty?: DifficultyLevel;
  userId?: string;
}

export interface StartConversationResponse {
  sessionId: string;
  roomName: string;
  token: string;
  url: string;
}

export interface ConversationMessage {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
  detectedErrors?: string[];
  corrections?: string[];
}

export interface CerebrasMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CerebrasRequest {
  model: string;
  messages: CerebrasMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface CerebrasResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
