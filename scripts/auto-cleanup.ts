#!/usr/bin/env tsx
/**
 * Automated session cleanup service
 * Runs periodically to clean up stale/abandoned LiveKit sessions
 *
 * Usage:
 *   npm run cleanup:auto              # Run once
 *   npm run cleanup:auto -- --watch   # Run continuously every 5 minutes
 */

import { liveKitService, sessionStore } from '../src/services/livekit.service';
import { config } from '../src/config/env';

const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_SESSION_AGE = 30 * 60 * 1000; // 30 minutes - sessions older than this with 0 participants get cleaned
const PARTICIPANT_IDLE_THRESHOLD = 10 * 60 * 1000; // 10 minutes - empty rooms older than this get cleaned

async function cleanupStaleSessions() {
  console.log('\n🧹 Starting automated session cleanup...');
  console.log(`📅 Time: ${new Date().toLocaleString()}`);
  console.log('━'.repeat(80));

  try {
    const rooms = await liveKitService.listRooms();
    const sessions = sessionStore.getAll().filter(s => !s.endedAt);

    console.log(`\n📊 Found ${rooms.length} active rooms and ${sessions.length} active sessions`);

    if (rooms.length === 0) {
      console.log('✅ No rooms to clean up');
      return 0;
    }

    let cleanedCount = 0;
    const now = Date.now();

    for (const room of rooms) {
      const roomAge = now - (Number(room.creationTime || 0) * 1000);
      const participants = await liveKitService.listParticipants(room.name);
      const session = sessions.find(s => s.roomName === room.name);

      // Get participant count (excluding agent)
      const userParticipants = participants.filter(p => !p.identity.includes('agent'));
      const hasUsers = userParticipants.length > 0;

      console.log(`\n🏠 Room: ${room.name}`);
      console.log(`   Age: ${Math.floor(roomAge / 1000 / 60)} minutes`);
      console.log(`   Participants: ${room.numParticipants} (${userParticipants.length} users, ${participants.length - userParticipants.length} agents)`);

      // Cleanup conditions:
      // 1. Empty room older than 10 minutes
      // 2. Room older than 30 minutes with no users
      // 3. Session marked as ended but room still exists

      let shouldCleanup = false;
      let reason = '';

      if (!hasUsers && roomAge > PARTICIPANT_IDLE_THRESHOLD) {
        shouldCleanup = true;
        reason = `Empty for ${Math.floor(roomAge / 1000 / 60)} minutes`;
      } else if (roomAge > MAX_SESSION_AGE && !hasUsers) {
        shouldCleanup = true;
        reason = `Stale session (${Math.floor(roomAge / 1000 / 60)} minutes old with no users)`;
      } else if (session?.endedAt) {
        shouldCleanup = true;
        reason = 'Session marked as ended';
      }

      if (shouldCleanup) {
        console.log(`   🗑️  CLEANUP: ${reason}`);

        try {
          // Mark session as ended
          if (session) {
            sessionStore.end(session.id);
          }

          // Delete the room
          await liveKitService.deleteRoom(room.name);
          cleanedCount++;

          console.log(`   ✅ Cleaned up successfully`);
        } catch (error) {
          console.error(`   ❌ Error cleaning up:`, error instanceof Error ? error.message : error);
        }
      } else {
        console.log(`   ✓ Active - keeping`);
      }
    }

    console.log('\n' + '━'.repeat(80));
    console.log(`✅ Cleanup complete: ${cleanedCount} room(s) cleaned up, ${rooms.length - cleanedCount} room(s) active`);
    console.log('━'.repeat(80));

    return cleanedCount;
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return 0;
  }
}

async function runContinuous() {
  console.log('🔄 Auto-cleanup service starting in watch mode');
  console.log(`⏰ Cleanup interval: ${CLEANUP_INTERVAL / 1000 / 60} minutes`);
  console.log(`🏠 LiveKit URL: ${config.livekit.url}`);
  console.log('\nPress Ctrl+C to stop\n');

  // Run immediately on start
  await cleanupStaleSessions();

  // Then run periodically
  setInterval(async () => {
    await cleanupStaleSessions();
  }, CLEANUP_INTERVAL);
}

async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch') || args.includes('-w');

  console.log('🧹 LiveKit Auto-Cleanup Service');
  console.log('━'.repeat(80));
  console.log(`LiveKit URL: ${config.livekit.url}\n`);

  if (watchMode) {
    await runContinuous();
  } else {
    // Run once and exit
    await cleanupStaleSessions();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down auto-cleanup service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down auto-cleanup service...');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
