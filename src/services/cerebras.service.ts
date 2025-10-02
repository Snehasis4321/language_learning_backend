import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import {
  CerebrasRequest,
  CerebrasResponse,
  CerebrasMessage,
  DifficultyLevel,
  ResponseWithTokens,
  TokenUsage,
} from '../types/conversation';

export class CerebrasService {
  private client: AxiosInstance;
  private model = 'llama3.3-70b';

  // Pricing per 1M tokens (in USD)
  private readonly pricing = {
    'llama3.3-70b': { input: 0.60, output: 0.60 },
    'llama3.1-8b': { input: 0.10, output: 0.10 },
  };

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
   * Calculate cost for token usage
   */
  private calculateCost(tokens: number, model: string, type: 'input' | 'output'): number {
    const rate = this.pricing[model as keyof typeof this.pricing]?.[type] || 0;
    return (tokens / 1_000_000) * rate;
  }

  /**
   * Generate a response from the AI teacher
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: CerebrasMessage[] = [],
    difficulty: DifficultyLevel = 'beginner',
    topic?: string
  ): Promise<ResponseWithTokens> {
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
        const content = response.data.choices[0].message.content;
        const usage = response.data.usage;

        // Calculate costs
        const inputCost = this.calculateCost(usage.prompt_tokens, this.model, 'input');
        const outputCost = this.calculateCost(usage.completion_tokens, this.model, 'output');
        const totalCost = inputCost + outputCost;

        const tokenUsage: TokenUsage = {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          estimatedCost: totalCost,
          model: this.model,
        };

        // Log token usage for debugging
        console.log('🔢 Token Usage:');
        console.log(`  Model: ${this.model}`);
        console.log(`  Prompt tokens: ${usage.prompt_tokens}`);
        console.log(`  Completion tokens: ${usage.completion_tokens}`);
        console.log(`  Total tokens: ${usage.total_tokens}`);
        console.log(`  Input cost: $${inputCost.toFixed(6)}`);
        console.log(`  Output cost: $${outputCost.toFixed(6)}`);
        console.log(`  Total cost: $${totalCost.toFixed(6)}`);

        return {
          response: content,
          tokenUsage,
        };
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
   * Summarize conversation history using LLaMA 3.1 8B (cheaper model)
   */
  async summarizeConversation(
    conversationHistory: CerebrasMessage[],
    difficulty: DifficultyLevel,
    topic?: string
  ): Promise<string> {
    const systemPrompt = `You are a helpful assistant that summarizes language learning conversations. Create a concise summary of the conversation that captures:
1. Main topics discussed
2. Key vocabulary or phrases practiced
3. Any grammar corrections made
4. Student's progress or difficulties

Keep the summary brief (2-3 sentences) but informative.`;

    const conversationText = conversationHistory
      .map((msg) => `${msg.role === 'user' ? 'Student' : 'Teacher'}: ${msg.content}`)
      .join('\n');

    const messages: CerebrasMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Summarize this language learning conversation:\n\n${conversationText}\n\nDifficulty: ${difficulty}${topic ? `\nTopic: ${topic}` : ''}`,
      },
    ];

    const request: CerebrasRequest = {
      model: 'llama3.1-8b', // Using cheaper 8B model for summarization
      messages,
      temperature: 0.3, // Lower temperature for more consistent summaries
      max_tokens: 200,
    };

    try {
      const response = await this.client.post<CerebrasResponse>('/chat/completions', request);

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }

      throw new Error('No response from Cerebras API');
    } catch (error) {
      console.error('Cerebras summarization error:', error);
      throw new Error(`Failed to summarize conversation: ${error}`);
    }
  }

  /**
   * Compact conversation history by summarizing old messages
   * Keeps recent messages and replaces old ones with a summary
   */
  async compactConversation(
    conversationHistory: CerebrasMessage[],
    difficulty: DifficultyLevel,
    topic?: string,
    keepRecentCount: number = 10
  ): Promise<CerebrasMessage[]> {
    // If conversation is short enough, no need to compact
    if (conversationHistory.length <= keepRecentCount * 2) {
      return conversationHistory;
    }

    // Split into old (to summarize) and recent (to keep)
    const messagesToSummarize = conversationHistory.slice(0, -keepRecentCount);
    const recentMessages = conversationHistory.slice(-keepRecentCount);

    // Generate summary of old messages
    const summary = await this.summarizeConversation(messagesToSummarize, difficulty, topic);

    // Create a summary message
    const summaryMessage: CerebrasMessage = {
      role: 'system',
      content: `Previous conversation summary: ${summary}`,
    };

    // Return summary + recent messages
    return [summaryMessage, ...recentMessages];
  }

  /**
   * Test connection to Cerebras API
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.generateResponse('Hello, can you hear me?', [], 'beginner');
      return result.response.length > 0;
    } catch (error) {
      console.error('Cerebras connection test failed:', error);
      return false;
    }
  }
}

export const cerebrasService = new CerebrasService();
