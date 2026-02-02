/**
 * Chat domain types
 * Message + MatchChat for 1:1 chat in values-based dating app.
 * Single source of truth: use this file for all chat-related types.
 */

export interface Message {
  id: string;
  senderId: string;
  text?: string;
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
