import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { config } from '../config/env';

interface AgentWorker {
  process: ChildProcess;
  startedAt: Date;
}

export class AgentService {
  private worker: AgentWorker | null = null;
  private workerScriptPath: string;

  constructor() {
    // Path to TypeScript agent worker
    this.workerScriptPath = path.join(__dirname, '../agent/worker.ts');
  }

  /**
   * Start the agent worker
   * The worker will listen for room connections and handle them automatically
   */
  async startWorker(): Promise<void> {
    if (this.worker) {
      console.log('Agent worker already running');
      return;
    }

    console.log('🤖 Starting LiveKit Agent Worker...');

    try {
      // Prepare environment variables
      const env = {
        ...process.env,
        LIVEKIT_URL: config.livekit.url,
        LIVEKIT_API_KEY: config.livekit.apiKey,
        LIVEKIT_API_SECRET: config.livekit.apiSecret,
      };

      // Use tsx to run TypeScript directly
      const workerProcess = spawn('npx', ['tsx', this.workerScriptPath], {
        env,
        cwd: path.join(__dirname, '../..'),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Store the worker process
      this.worker = {
        process: workerProcess,
        startedAt: new Date(),
      };

      // Handle worker output
      workerProcess.stdout?.on('data', (data) => {
        console.log(`[Agent Worker] ${data.toString().trim()}`);
      });

      workerProcess.stderr?.on('data', (data) => {
        console.error(`[Agent Worker ERROR] ${data.toString().trim()}`);
      });

      // Handle worker exit
      workerProcess.on('exit', (code, signal) => {
        console.log(`Agent worker exited with code ${code}, signal ${signal}`);
        this.worker = null;
      });

      workerProcess.on('error', (error) => {
        console.error('Agent worker process error:', error);
        this.worker = null;
      });

      // Wait a bit to ensure worker starts successfully
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log('✅ Agent worker started successfully');
    } catch (error) {
      console.error('Failed to start agent worker:', error);
      throw new Error(`Failed to start agent worker: ${error}`);
    }
  }

  /**
   * Notify that a session is starting (for logging/tracking)
   * The LiveKit agent worker will automatically handle the room
   */
  async notifySessionStart(
    roomName: string,
    difficulty: string,
    topic?: string,
    customSystemPrompt?: string
  ): Promise<void> {
    console.log(`📢 Session starting: ${roomName}`);
    console.log(`   Difficulty: ${difficulty}`);
    if (topic) console.log(`   Topic: ${topic}`);
    if (customSystemPrompt) console.log(`   ✨ Using personalized system prompt`);
    console.log('   Worker will automatically join the room');
    // Note: customSystemPrompt is passed via room metadata
  }

  /**
   * Notify that a session is ending (for logging/tracking)
   */
  async notifySessionEnd(roomName: string): Promise<void> {
    console.log(`📢 Session ending: ${roomName}`);
    console.log('   Worker will automatically leave the room');
  }

  /**
   * Stop the agent worker
   */
  async stopWorker(): Promise<void> {
    if (!this.worker) {
      console.log('No agent worker running');
      return;
    }

    console.log('🛑 Stopping agent worker...');

    try {
      this.worker.process.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Force kill if still running
      if (!this.worker.process.killed) {
        this.worker.process.kill('SIGKILL');
      }

      this.worker = null;
      console.log('✓ Agent worker stopped');
    } catch (error) {
      console.error('Error stopping agent worker:', error);
      this.worker = null;
    }
  }

  /**
   * Check if worker is running
   */
  isWorkerRunning(): boolean {
    return this.worker !== null;
  }

  /**
   * Get worker info
   */
  getWorkerInfo(): AgentWorker | null {
    return this.worker;
  }
}

export const agentService = new AgentService();

// Cleanup on process exit
process.on('SIGTERM', async () => {
  await agentService.stopWorker();
});

process.on('SIGINT', async () => {
  await agentService.stopWorker();
});
