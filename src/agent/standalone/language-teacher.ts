/**
 * Standalone Language Teacher Agent for LiveKit Cloud Deployment
 * This version has NO backend dependencies - uses env vars directly
 */

import { WorkerOptions, cli, llm, voice } from '@livekit/agents';
import { LLM, STT, TTS } from '@livekit/agents-plugin-openai';
import axios from 'axios';

// Types
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

interface CerebrasMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Standalone Cerebras client (no backend dependency)
 */
class StandaloneCerebrasClient {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.CEREBRAS_API_KEY || '';
    this.apiUrl = process.env.CEREBRAS_API_URL || 'https://api.cerebras.ai/v1';

    if (!this.apiKey) {
      throw new Error('CEREBRAS_API_KEY environment variable is required');
    }
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: CerebrasMessage[],
    difficulty: DifficultyLevel,
    topic?: string
  ): Promise<{ response: string }> {
    const systemPrompt = this.buildSystemPrompt(difficulty, topic);

    const messages: CerebrasMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: 'llama3.3-70b',
          messages,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content || '';
      return { response: content };
    } catch (error) {
      console.error('Cerebras API error:', error);
      throw error;
    }
  }

  private buildSystemPrompt(difficulty: DifficultyLevel, topic?: string): string {
    let prompt = `You are a patient and encouraging language teacher. Your role is to:
- Help students practice speaking naturally
- Correct mistakes gently and constructively
- Ask follow-up questions to keep conversation flowing
- Provide clear explanations when needed
- Adjust your language to the student's level

Keep responses conversational, concise, and encouraging.`;

    if (difficulty === 'beginner') {
      prompt += '\n\nUse simple vocabulary and short sentences. Speak slowly and clearly.';
    } else if (difficulty === 'intermediate') {
      prompt += '\n\nUse moderately complex language. Introduce new vocabulary in context.';
    } else {
      prompt += '\n\nUse natural, complex language. Discuss nuanced topics.';
    }

    if (topic) {
      prompt += `\n\nCurrent topic: ${topic}`;
    }

    return prompt;
  }
}

/**
 * Build system prompt based on difficulty and topic
 */
function buildSystemPrompt(difficulty: string = 'beginner', topic?: string): string {
  let prompt = `You are a patient and encouraging language teacher. Your role is to:
- Help students practice speaking naturally
- Correct mistakes gently and constructively
- Ask follow-up questions to keep conversation flowing
- Provide clear explanations when needed
- Adjust your language to the student's level

Keep responses conversational, concise, and encouraging.`;

  if (difficulty === 'beginner') {
    prompt += '\n\nUse simple vocabulary and short sentences. Speak slowly and clearly.';
  } else if (difficulty === 'intermediate') {
    prompt += '\n\nUse moderately complex language. Introduce new vocabulary in context.';
  } else {
    prompt += '\n\nUse natural, complex language. Discuss nuanced topics.';
  }

  if (topic) {
    prompt += `\n\nCurrent topic: ${topic}`;
  }

  return prompt;
}

/**
 * Custom Agent class that uses Cerebras for LLM
 */
class LanguageTeacherAgent extends voice.Agent {
  private conversationHistory: CerebrasMessage[] = [];
  private difficulty: DifficultyLevel = 'beginner';
  private topic?: string;
  private cerebrasClient: StandaloneCerebrasClient;

  constructor(instructions: string, difficulty: DifficultyLevel, topic?: string) {
    // Validate OpenAI API key for STT/TTS
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    super({
      instructions,
      stt: new STT({ model: 'whisper-1' }),
      tts: new TTS({ voice: 'alloy', model: 'tts-1' }),
      llm: new LLM({ model: 'gpt-3.5-turbo' }), // Placeholder, we'll override
    });

    this.difficulty = difficulty;
    this.topic = topic;
    this.cerebrasClient = new StandaloneCerebrasClient();

    // Initialize with system prompt
    this.conversationHistory.push({
      role: 'system',
      content: instructions,
    });
  }

  /**
   * Override the LLM node to use Cerebras instead of OpenAI
   */
  async llmNode(
    chatCtx: llm.ChatContext,
    _toolCtx: llm.ToolContext,
    _modelSettings: voice.ModelSettings
  ): Promise<ReadableStream<llm.ChatChunk> | null> {
    // Get all items from the chat context
    const items = chatCtx.items;
    const messages = items.filter((item) => item.type === 'message') as llm.ChatMessage[];
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== 'user') {
      return null;
    }

    try {
      // Get text content from the last message
      const userText = lastMessage.textContent || '';

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userText,
      });

      // Generate response using Cerebras
      const result = await this.cerebrasClient.generateResponse(
        userText,
        this.conversationHistory.slice(1, -1), // Exclude system and current user message
        this.difficulty,
        this.topic
      );

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: result.response,
      });

      // Return a readable stream with the response
      return new ReadableStream({
        start(controller) {
          controller.enqueue({
            id: 'cerebras-' + Date.now(),
            delta: {
              role: 'assistant',
              content: result.response,
            },
          });
          controller.close();
        },
      });
    } catch (error) {
      console.error('Cerebras LLM error:', error);

      // Return error response as a stream
      return new ReadableStream({
        start(controller) {
          controller.enqueue({
            id: 'cerebras-error-' + Date.now(),
            delta: {
              role: 'assistant',
              content: "I'm having trouble thinking right now. Could you please repeat that?",
            },
          });
          controller.close();
        },
      });
    }
  }
}

/**
 * Factory function to create agent instances
 * This is called by the worker for each room connection
 */
async function createAgent(): Promise<voice.Agent> {
  // Default settings
  const difficulty: DifficultyLevel = 'beginner';
  const topic: string | undefined = undefined;

  // TODO: Get metadata from room/participant when available
  // For now, using defaults

  const instructions = buildSystemPrompt(difficulty, topic);
  const agent = new LanguageTeacherAgent(instructions, difficulty, topic);

  console.log('🤖 Language Teacher Agent created');
  console.log(`   Difficulty: ${difficulty}`);
  if (topic) console.log(`   Topic: ${topic}`);

  return agent;
}

/**
 * Default export for the worker
 */
export default createAgent;

/**
 * Start the agent worker (for standalone execution)
 */
if (require.main === module) {
  const workerOptions = new WorkerOptions({
    agent: __filename,
    logLevel: 'info',
  });

  console.log('🚀 Starting Standalone Language Teacher Agent...');
  console.log('   Using Cerebras LLaMA 3.3-70B for LLM');
  console.log('   Using OpenAI Whisper for STT');
  console.log('   Using OpenAI TTS for voice synthesis');

  cli.runApp(workerOptions);
}
