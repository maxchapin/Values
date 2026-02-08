/**
 * Chat domain types
 * Message + MatchChat for 1:1 chat in values-based dating app.
 * Text-only: no image/photo/file attachments for safety.
 */

/** Outgoing message payload: text only. No image/camera/file. */
export interface SendMessagePayload {
  text: string;
}

export interface Message {
  id: string;
  senderId: string;
  /** Text content only. No image/photo/media in chat. */
  text?: string;
  /**
   * @deprecated Legacy only. Do not send or display; chat is text-only for safety.
   * Kept for backwards compatibility with existing data.
   */
  imageUrl?: string;
  /** Date when sent; may be number after JSON round-trip (normalize with new Date()). */
  timestamp: Date;
  isRead: boolean;
}

export interface MatchChat {
  matchId: string;
  messages: Message[];
  unreadCount: number;
  lastMessage?: string;
}
