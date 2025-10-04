const { RoomServiceClient } = require('livekit-server-sdk');

// Validate required environment variables
if (!process.env.LIVEKIT_URL) {
  throw new Error('LIVEKIT_URL environment variable is required');
}
if (!process.env.LIVEKIT_API_KEY) {
  throw new Error('LIVEKIT_API_KEY environment variable is required');
}
if (!process.env.LIVEKIT_API_SECRET) {
  throw new Error('LIVEKIT_API_SECRET environment variable is required');
}

const client = new RoomServiceClient(
  process.env.LIVEKIT_URL,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

async function cleanupRooms() {
  try {
    const rooms = await client.listRooms();
    console.log(`Found ${rooms.length} active rooms`);

    for (const room of rooms) {
      console.log(`Deleting room: ${room.name} (${room.numParticipants} participants)`);
      await client.deleteRoom(room.name);
    }

    console.log('✅ All rooms deleted');
  } catch (error) {
    console.error('Error:', error);
  }
}

cleanupRooms();
