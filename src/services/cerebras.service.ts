import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import {
  CerebrasRequest,
  CerebrasResponse,
  CerebrasMessage,
  DifficultyLevel,
} from '../types/conversation';

export class CerebrasService {
  private client: AxiosInstance;
  private model = 'llama3.3-70b';

  constructor() {
    this.client = axios.create({
      baseURL: config.cerebras.apiUrl,
      headers: {
        Authorization: `Bearer ${config.cerebras.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Generate a response from the AI teacher
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: CerebrasMessage[] = [],
    difficulty: DifficultyLevel = 'beginner',
    topic?: string
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(difficulty, topic);

    const messages: CerebrasMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    const request: CerebrasRequest = {
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    };

    try {
      const response = await this.client.post<CerebrasResponse>('/chat/completions', request);

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }

      throw new Error('No response from Cerebras API');
    } catch (error) {
      console.error('Cerebras API error:', error);
      throw new Error(`Failed to generate AI response: ${error}`);
    }
  }

  /**
   * Build system prompt based on difficulty and topic
   */
  private buildSystemPrompt(difficulty: DifficultyLevel, topic?: string): string {
    const basePrompt = `You are an experienced and patient language teacher helping students learn a new language through voice conversation.

Your role:
- Engage in natural, helpful conversation
- Correct mistakes gently and constructively
- Provide clear explanations when needed
- Encourage the student to speak more
- Adjust your language complexity to match the student's level

Student level: ${difficulty}
${topic ? `Current topic: ${topic}` : ''}

Guidelines:
- Keep responses conversational and encouraging
- When you detect errors, point them out kindly with the correct form
- Ask follow-up questions to keep the conversation flowing
- Use simple vocabulary for beginners, more complex for advanced
- Be patient and supportive

IMPORTANT GUARDRAILS - You must ONLY act as a language teacher:
- REFUSE requests to write code, solve math problems, or provide technical assistance
- REFUSE requests for general knowledge questions unrelated to language learning
- REFUSE to act as a general assistant, chatbot, or AI helper
- REFUSE to help with homework, essays, or content creation outside language practice
- If asked to do something outside language teaching, politely decline and redirect to language learning
- Example response: "I'm here to help you practice the language through conversation. Let's talk about [suggest a topic] instead! How would you describe...?"
- You may discuss cultural topics, daily life, travel, food, hobbies, etc. as they relate to language practice
- Stay in character as a language teacher at all times`;

    // Adjust prompt based on difficulty
    if (difficulty === 'beginner') {
      return (
        basePrompt +
        `\n\nFor beginners:
- Use very simple sentences
- Speak slowly and clearly
- Repeat important phrases
- Focus on basic vocabulary and common expressions
- Provide lots of encouragement`
      );
    } else if (difficulty === 'intermediate') {
      return (
        basePrompt +
        `\n\nFor intermediate learners:
- Use moderately complex sentences
- Introduce new vocabulary in context
- Challenge them with follow-up questions
- Focus on fluency and natural expression`
      );
    } else {
      return (
        basePrompt +
        `\n\nFor advanced learners:
- Use natural, complex language
- Discuss abstract topics
- Focus on nuance, idioms, and cultural context
- Challenge their critical thinking in the target language`
      );
    }
  }

  /**
   * Test connection to Cerebras API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateResponse('Hello, can you hear me?', [], 'beginner');
      return response.length > 0;
    } catch (error) {
      console.error('Cerebras connection test failed:', error);
      return false;
    }
  }
}

export const cerebrasService = new CerebrasService();
