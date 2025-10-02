/**
 * LiveKit Agent Worker Entry Point
 * This worker listens for room connections and spawns language teacher agents
 */

import { startAgentWorker } from './language-teacher.agent';

// Start the agent worker
startAgentWorker();
