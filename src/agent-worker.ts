/**
 * Standalone LiveKit Agent Worker
 * Run this separately from the main backend server
 */

import { startAgentWorker } from './agent/language-teacher.agent';
import { config, validateEnv } from './config/env';

// Validate environment variables
validateEnv();

console.log('='.repeat(50));
console.log('🤖 LiveKit Agent Worker (Standalone)');
console.log('='.repeat(50));
console.log(`Environment: ${config.nodeEnv}`);
console.log(`LiveKit URL: ${config.livekit.url}`);
console.log('='.repeat(50));
console.log('');

// Start the agent worker
startAgentWorker();
