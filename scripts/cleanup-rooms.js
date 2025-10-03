const { RoomServiceClient } = require('livekit-server-sdk');

const client = new RoomServiceClient(
  process.env.LIVEKIT_URL || 'wss://james-amnjy8db.livekit.cloud',
  process.env.LIVEKIT_API_KEY || 'APIT6pKiQwTmtP6',
  process.env.LIVEKIT_API_SECRET || 'XDfjcvkW9PqnwhmBrDidaXkbFr3XKGLertEfURFW5PbA'
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
