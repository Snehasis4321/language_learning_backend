#!/usr/bin/env tsx
/**
 * CLI script to manually clean up active LiveKit sessions
 *
 * Usage:
 *   npm run cleanup                    # List all active sessions
 *   npm run cleanup <room-name>        # End a specific session by room name
 *   npm run cleanup --all              # End ALL active sessions
 */

import { liveKitService, sessionStore } from '../src/services/livekit.service';
import { config } from '../src/config/env';

async function listActiveSessions() {
  console.log('📋 Fetching active sessions...\n');

  // Get rooms from LiveKit
  const rooms = await liveKitService.listRooms();

  // Get sessions from session store
  const sessions = sessionStore.getAll().filter(s => !s.endedAt);

  console.log(`Found ${rooms.length} active LiveKit rooms and ${sessions.length} active sessions\n`);

  if (rooms.length === 0) {
    console.log('✅ No active rooms found');
    return [];
  }

  console.log('Active Rooms:');
  console.log('━'.repeat(80));

  for (const room of rooms) {
    const participants = await liveKitService.listParticipants(room.name);
    const session = sessions.find(s => s.roomName === room.name);

    console.log(`\n🏠 Room: ${room.name}`);
    console.log(`   Created: ${new Date(Number(room.creationTime || 0) * 1000).toLocaleString()}`);
    console.log(`   Participants: ${room.numParticipants}`);

    if (participants.length > 0) {
      console.log(`   Participant identities:`);
      participants.forEach(p => {
        console.log(`      - ${p.identity} (${p.state})`);
      });
    }

    if (session) {
      console.log(`   Session ID: ${session.id}`);
      console.log(`   Difficulty: ${session.difficulty}`);
      console.log(`   Topic: ${session.topic || 'None'}`);
    }
  }

  console.log('\n' + '━'.repeat(80));

  return rooms;
}

async function endSession(roomName: string) {
  console.log(`\n🛑 Ending session for room: ${roomName}`);

  try {
    // Find session by room name
    const session = sessionStore.getByRoomName(roomName);

    if (session) {
      sessionStore.end(session.id);
      console.log(`   ✅ Session ${session.id} marked as ended`);
    }

    // Delete the LiveKit room
    await liveKitService.deleteRoom(roomName);
    console.log(`   ✅ Room ${roomName} deleted from LiveKit`);

    console.log('\n✅ Session ended successfully');
  } catch (error) {
    console.error(`\n❌ Error ending session:`, error);
    process.exit(1);
  }
}

async function endAllSessions() {
  console.log('\n🛑 Ending ALL active sessions...\n');

  const rooms = await liveKitService.listRooms();

  if (rooms.length === 0) {
    console.log('✅ No active sessions to end');
    return;
  }

  console.log(`Found ${rooms.length} rooms to clean up\n`);

  for (const room of rooms) {
    await endSession(room.name);
  }

  console.log(`\n✅ All sessions ended (${rooms.length} total)`);
}

async function main() {
  const args = process.argv.slice(2);

  console.log('🧹 LiveKit Session Cleanup Tool');
  console.log('━'.repeat(80));
  console.log(`LiveKit URL: ${config.livekit.url}\n`);

  if (args.length === 0) {
    // No arguments - list active sessions
    await listActiveSessions();
    console.log('\nUsage:');
    console.log('  npm run cleanup <room-name>   # End a specific session');
    console.log('  npm run cleanup --all         # End all sessions');
  } else if (args[0] === '--all') {
    // End all sessions
    await endAllSessions();
  } else {
    // End specific session by room name
    const roomName = args[0];
    await endSession(roomName);
  }
}

main()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
