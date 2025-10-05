import { AccessToken, RoomServiceClient, Room, ParticipantInfo } from 'livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { ConversationSession, StartConversationRequest } from '../types/conversation';

export class LiveKitService {
  private roomService: RoomServiceClient;

  constructor() {
    this.roomService = new RoomServiceClient(
      config.livekit.url,
      config.livekit.apiKey,
      config.livekit.apiSecret
    );
  }

  /**
   * Create a new conversation room
   */
  async createRoom(roomName: string, metadata?: string): Promise<void> {
    try {
      const room = await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 300, // Room closes after 5 minutes of being empty
        maxParticipants: 5,
        metadata, // Pass metadata to room (agent will read this)
      });
      console.log(`Room created: ${roomName}${metadata ? ' with metadata' : ''}`);
      console.log(`📦 Room metadata confirmed on creation: "${room.metadata}"`);
      console.log(`📦 Room metadata length: ${room.metadata?.length || 0} bytes`);
    } catch (error) {
      console.error('Error creating room:', error);
      throw new Error(`Failed to create room: ${error}`);
    }
  }

  /**
   * Generate access token for a participant
   */
  async generateToken(
    roomName: string,
    participantName: string,
    metadata?: string
  ): Promise<string> {
    const token = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
      identity: participantName,
      name: participantName,
      metadata,
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return await token.toJwt();
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
      console.log(`Room deleted: ${roomName}`);
    } catch (error) {
      console.error('Error deleting room:', error);
      // Don't throw - room might already be deleted
    }
  }

  /**
   * List active rooms
   */
  async listRooms(): Promise<Room[]> {
    try {
      const rooms = await this.roomService.listRooms();
      return rooms;
    } catch (error) {
      console.error('Error listing rooms:', error);
      return [];
    }
  }

  /**
   * List participants in a room
   */
  async listParticipants(roomName: string): Promise<ParticipantInfo[]> {
    try {
      const participants = await this.roomService.listParticipants(roomName);
      return participants;
    } catch (error) {
      console.error('Error listing participants:', error);
      return [];
    }
  }

  /**
   * Test connection to LiveKit
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listRooms();
      return true;
    } catch (error) {
      console.error('LiveKit connection test failed:', error);
      return false;
    }
  }
}

export const liveKitService = new LiveKitService();

/**
 * In-memory session storage (replace with database later)
 */
class SessionStore {
  private sessions = new Map<string, ConversationSession>();

  create(request: StartConversationRequest): ConversationSession {
    const sessionId = uuidv4();
    const roomName = `room_${sessionId.substring(0, 8)}`;

    const session: ConversationSession = {
      id: sessionId,
      roomName,
      userId: request.userId,
      type: request.type || 'free',
      topic: request.topic,
      difficulty: request.difficulty || 'beginner',
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  get(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  getByRoomName(roomName: string): ConversationSession | undefined {
    return Array.from(this.sessions.values()).find(s => s.roomName === roomName);
  }

  end(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endedAt = new Date();
    }
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getAll(): ConversationSession[] {
    return Array.from(this.sessions.values());
  }
}

export const sessionStore = new SessionStore();
