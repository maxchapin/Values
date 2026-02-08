/**
 * Chat Service – Real-time and optimistic chat abstraction.
 * In-memory implementation; structured so it can be wired to Firebase/Supabase later.
 *
 * - subscribeToMatchChat(matchId, callback): real-time updates for one match
 * - sendMessage(matchId, currentUserId, input): optimistic send, then confirm/fail
 * - markMatchRead(matchId, currentUserId): mark as read and update preview
 * - getMatchChat(matchId): sync snapshot for initial render
 */

import type { Message, MatchChat } from '../types/chatTypes';

export interface MatchChatUpdate {
  matchId: string;
  messages: Message[];
  lastMessage: string;
  unreadCount: number;
  lastMessageAt?: number;
}

/** Text only. No image/camera/file attachments (safety). */
export interface SendMessageInput {
  text: string;
}

type Unsubscribe = () => void;

function getChatStore() {
  return require('../store/chatStore').useChatStore.getState();
}

function getMatchesStore() {
  return require('../store/matchesStore').useMatchesStore.getState();
}

const listeners = new Map<string, Set<(data: MatchChatUpdate) => void>>();

function notify(matchId: string): void {
  const chat = getChatStore();
  const matches = getMatchesStore();
  const messages = chat.getMessagesForMatch(matchId);
  const preview = matches.getConversationPreview(matchId);
  const update: MatchChatUpdate = {
    matchId,
    messages,
    lastMessage: preview.lastMessage,
    unreadCount: preview.unreadCount,
    lastMessageAt: preview.lastMessageAt,
  };
  const set = listeners.get(matchId);
  if (set) {
    set.forEach((cb) => {
      try {
        cb(update);
      } catch (e) {
        if (__DEV__) console.warn('[chatService] subscriber error:', e);
      }
    });
  }
}

/**
 * Subscribe to real-time updates for a match's chat.
 * Callback is invoked whenever messages, lastMessage, unreadCount, or lastMessageAt change.
 * Returns an unsubscribe function; call it on component unmount to avoid memory leaks.
 */
export function subscribeToMatchChat(
  matchId: string,
  callback: (data: MatchChatUpdate) => void
): Unsubscribe {
  if (!listeners.has(matchId)) {
    listeners.set(matchId, new Set());
  }
  listeners.get(matchId)!.add(callback);
  // Emit current state immediately
  notify(matchId);
  return () => {
    const set = listeners.get(matchId);
    if (set) {
      set.delete(callback);
      if (set.size === 0) listeners.delete(matchId);
    }
  };
}

/**
 * Get current snapshot for a match (for initial render before subscription fires).
 */
export function getMatchChat(matchId: string): MatchChatUpdate {
  const chat = getChatStore();
  const matches = getMatchesStore();
  const messages = chat.getMessagesForMatch(matchId);
  const preview = matches.getConversationPreview(matchId);
  return {
    matchId,
    messages,
    lastMessage: preview.lastMessage,
    unreadCount: preview.unreadCount,
    lastMessageAt: preview.lastMessageAt,
  };
}

/**
 * Send a message: optimistic update, then mock confirm (or simulate failure).
 * On success: message stays; Matches list preview/unread already updated by store.
 * On failure: optimistic message is removed and subscribers are notified.
 *
 * Set simulateFailure: true (e.g. __DEV__) to test rollback.
 */
export function sendMessage(
  matchId: string,
  currentUserId: string,
  input: SendMessageInput,
  options?: { simulateFailure?: boolean }
): Promise<void> {
  const chat = getChatStore();
  const text = input.text?.trim() ?? '';

  if (!text) {
    return Promise.resolve();
  }

  const msg = chat.sendMessage(matchId, currentUserId, text);
  notify(matchId);

  return new Promise((resolve, reject) => {
    const delay = options?.simulateFailure ? 200 : 400;
    setTimeout(() => {
      if (options?.simulateFailure) {
        chat.removeMessage(matchId, msg.id);
        notify(matchId);
        reject(new Error('Send failed (simulated)'));
      } else {
        notify(matchId);
        resolve();
      }
    }, delay);
  });
}

/**
 * Mark all messages from the other user (matchId) as read and set unreadCount to 0.
 * Notifies subscribers so UI (chat + Matches list) updates.
 */
export function markMatchRead(matchId: string, currentUserId: string): void {
  const chat = getChatStore();
  chat.markMatchMessagesRead(matchId, currentUserId);
  notify(matchId);
}

/**
 * Build a MatchChat object from a MatchChatUpdate (for components that expect MatchChat).
 */
export function toMatchChat(update: MatchChatUpdate): MatchChat {
  return {
    matchId: update.matchId,
    messages: update.messages,
    unreadCount: update.unreadCount,
    lastMessage: update.lastMessage,
  };
}
