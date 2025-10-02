/**
 * Language Teacher AI Agent for LiveKit
 * Handles real-time voice conversations with language learners
 */

import { WorkerOptions, cli, llm, voice } from '@livekit/agents';
import { LLM, STT, TTS } from '@livekit/agents-plugin-openai';
import { cerebrasService } from '../services/cerebras.service';
import type { CerebrasMessage, DifficultyLevel } from '../types/conversation';

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

  constructor(instructions: string, difficulty: DifficultyLevel, topic?: string) {
    super({
      instructions,
      stt: new STT({ model: 'whisper-1' }),
      tts: new TTS({ voice: 'alloy', model: 'tts-1' }),
      llm: new LLM({ model: 'gpt-3.5-turbo' }), // Placeholder, we'll override
    });

    this.difficulty = difficulty;
    this.topic = topic;

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
      const result = await cerebrasService.generateResponse(
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
 * The worker expects a default export that returns an Agent
 */
export default createAgent;

/**
 * Start the agent worker
 * This can be called to run the agent in worker mode
 */
export function startAgentWorker() {
  const workerOptions = new WorkerOptions({
    agent: __filename, // Path to this file
    logLevel: 'info',
  });

  console.log('🚀 Starting Language Teacher Agent Worker...');

  cli.runApp(workerOptions);
}
