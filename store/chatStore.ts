/**
 * Chat Store
 * In-memory messages per match, optimistic send, sync with conversation preview.
 * Mock for now; can plug in Firebase/Supabase later.
 */

import { create } from 'zustand';
import type { Message } from '../types/chatTypes';

const PREVIEW_MAX_LEN = 40;

function getMatchesStore() {
  return require('./matchesStore').useMatchesStore.getState();
}

interface ChatStore {
  // key: matchId (other user id)
  _messagesByMatch: Record<string, Message[]>;
  _typingByMatch: Record<string, boolean>;

  getMessagesForMatch: (matchId: string) => Message[];
  /** Text only. No image/photo/media. */
  sendMessage: (matchId: string, currentUserId: string, text: string) => Message;
  removeMessage: (matchId: string, messageId: string) => void;
  setTyping: (matchId: string, isTyping: boolean) => void;
  isTyping: (matchId: string) => boolean;
  markMatchMessagesRead: (matchId: string, readerUserId: string) => void;
  seedMockMessages: (matchId: string, currentUserId: string, otherUserId: string) => void;
}

function lastMessagePreviewAndTime(messages: Message[], currentUserId: string): { preview: string; lastMessageAt?: number } {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const content = m.text ?? '';
    if (content) {
      const preview = content.length > PREVIEW_MAX_LEN ? content.slice(0, PREVIEW_MAX_LEN - 1) + '…' : content;
      const ts = m.timestamp != null ? new Date(m.timestamp as Date | number).getTime() : NaN;
      const lastMessageAt = Number.isFinite(ts) ? ts : undefined;
      return { preview, lastMessageAt };
    }
  }
  return { preview: '' };
}

function countUnreadForUser(messages: Message[], otherUserId: string): number {
  return messages.filter((m) => m.senderId === otherUserId && !m.isRead).length;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  _messagesByMatch: {},
  _typingByMatch: {},

  getMessagesForMatch: (matchId: string): Message[] => {
    const state = get() as { _messagesByMatch: Record<string, Message[]> };
    const list = state._messagesByMatch[matchId] ?? [];
    const normalized = list.map((m) => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp as number),
    }));
    return [...normalized].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  },

  sendMessage: (matchId: string, currentUserId: string, text: string): Message => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const msg: Message = {
      id,
      senderId: currentUserId,
      text: text || undefined,
      timestamp: new Date(),
      isRead: false,
    };
    set((state) => {
      const byMatch = state._messagesByMatch ?? {};
      const existing = byMatch[matchId] ?? [];
      // Append new message and maintain ascending order (oldest → newest)
      const list = [...existing, msg].sort((a, b) => {
        const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp as number).getTime();
        const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp as number).getTime();
        return ta - tb;
      });
      const next = { ...byMatch, [matchId]: list };
      const { preview, lastMessageAt } = lastMessagePreviewAndTime(list, currentUserId);
      const unread = countUnreadForUser(list, matchId);
      getMatchesStore().setConversationPreview(matchId, preview, unread, lastMessageAt);
      return { _messagesByMatch: next };
    });
    return msg;
  },

  removeMessage: (matchId: string, messageId: string) => {
    set((state) => {
      const byMatch = state._messagesByMatch ?? {};
      const list = (byMatch[matchId] ?? []).filter((m) => m.id !== messageId);
      const next = { ...byMatch, [matchId]: list };
      const { preview, lastMessageAt } = lastMessagePreviewAndTime(list, '');
      const unread = countUnreadForUser(list, matchId);
      getMatchesStore().setConversationPreview(matchId, preview, unread, lastMessageAt);
      return { _messagesByMatch: next };
    });
  },

  setTyping: (matchId: string, isTyping: boolean) => {
    set((state) => ({
      _typingByMatch: { ...(state._typingByMatch ?? {}), [matchId]: isTyping },
    }));
  },

  isTyping: (matchId: string): boolean => {
    return (get()._typingByMatch ?? {})[matchId] ?? false;
  },

  markMatchMessagesRead: (matchId: string, readerUserId: string) => {
    set((state) => {
      const byMatch = state._messagesByMatch ?? {};
      const list = byMatch[matchId] ?? [];
      const updated = list.map((m) =>
        m.senderId !== readerUserId ? { ...m, isRead: true } : m
      );
      getMatchesStore().markConversationRead(matchId);
      return { _messagesByMatch: { ...byMatch, [matchId]: updated } };
    });
  },

  seedMockMessages: (matchId: string, currentUserId: string, otherUserId: string) => {
    const state = get();
    const existing = (state._messagesByMatch ?? {})[matchId] ?? [];
    if (existing.length > 0) return;

    const base = Date.now() - 86400 * 2 * 1000; // 2 days ago
    const mock: Message[] = [
      {
        id: 'm1',
        senderId: otherUserId,
        text: 'Hey! Love your values — we have a lot in common.',
        timestamp: new Date(base + 3600000),
        isRead: true,
      },
      {
        id: 'm2',
        senderId: currentUserId,
        text: 'Thanks! Same here, your profile stood out.',
        timestamp: new Date(base + 4000000),
        isRead: true,
      },
      {
        id: 'm3',
        senderId: otherUserId,
        text: 'Would you want to grab coffee sometime?',
        timestamp: new Date(base + 5000000),
        isRead: true,
      },
      {
        id: 'm4',
        senderId: currentUserId,
        text: 'Yes, I’d like that! How’s this weekend?',
        timestamp: new Date(base + 5200000),
        isRead: true,
      },
      {
        id: 'm5',
        senderId: otherUserId,
        text: 'Saturday works. I’ll send you a spot.',
        timestamp: new Date(base + 86400000), // yesterday
        isRead: true,
      },
      {
        id: 'm6',
        senderId: otherUserId,
        text: 'Looking forward to it 😊',
        timestamp: new Date(base + 86400000 + 60000),
        isRead: false,
      },
    ];
    set((s) => ({
      _messagesByMatch: { ...(s._messagesByMatch ?? {}), [matchId]: mock },
    }));
    const { preview, lastMessageAt } = lastMessagePreviewAndTime(mock, currentUserId);
    const unread = countUnreadForUser(mock, otherUserId);
    getMatchesStore().setConversationPreview(matchId, preview, unread, lastMessageAt);
  },
}));
