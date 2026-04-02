/**
 * Chat Service – realtime + optimistic send.
 * Mock mode: in-memory only. Supabase mode: `chat_messages` + Realtime when `threadMatchUuid` is passed.
 */

import type { Message, MatchChat } from '../types/chatTypes';
import { supabase } from './supabase';
import {
  fetchChatMessagesForMatch,
  insertChatMessage,
  markReceivedChatMessagesRead,
  chatMessageRowToMessage,
} from './supabaseChat';

export interface MatchChatUpdate {
  /** Partner user id (matches list / preview key). */
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

export interface ChatServiceOptions {
  /** `public.matches.id` thread; required for persisted chat. */
  threadMatchUuid?: string;
}

type Unsubscribe = () => void;

function getChatStore() {
  return require('../store/chatStore').useChatStore.getState();
}

function getMatchesStore() {
  return require('../store/matchesStore').useMatchesStore.getState();
}

const listeners = new Map<string, Set<(data: MatchChatUpdate) => void>>();

/** Supabase Realtime: one channel per thread while refcount is positive. */
type ThreadRealtimeEntry = {
  partnerUserId: string;
  channel: ReturnType<typeof supabase.channel> | null;
  cancelled: boolean;
};
const threadRealtimeByThreadId = new Map<string, ThreadRealtimeEntry>();
const threadRealtimeRefCount = new Map<string, number>();

async function startThreadRealtime(threadMatchUuid: string, entry: ThreadRealtimeEntry): Promise<void> {
  try {
    await loadThreadFromServer(threadMatchUuid, entry.partnerUserId);
  } catch (e) {
    if (__DEV__) console.warn('[chatService] loadThreadFromServer:', e);
  }
  if (entry.cancelled) return;

  const channel = supabase
    .channel(`chat:${threadMatchUuid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `match_id=eq.${threadMatchUuid}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const m = chatMessageRowToMessage(payload.new);
          if (m) {
            getChatStore().upsertMessage(entry.partnerUserId, m);
            notify(entry.partnerUserId);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' && __DEV__) {
        console.warn('[chatService] Realtime channel error for', threadMatchUuid);
      }
    });

  if (entry.cancelled) {
    void supabase.removeChannel(channel);
    return;
  }
  entry.channel = channel;
}

function notify(partnerUserId: string): void {
  const chat = getChatStore();
  const matches = getMatchesStore();
  const messages = chat.getMessagesForMatch(partnerUserId);
  const preview = matches.getConversationPreview(partnerUserId);
  const update: MatchChatUpdate = {
    matchId: partnerUserId,
    messages,
    lastMessage: preview.lastMessage,
    unreadCount: preview.unreadCount,
    lastMessageAt: preview.lastMessageAt,
  };
  const set = listeners.get(partnerUserId);
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

async function loadThreadFromServer(threadMatchUuid: string, partnerUserId: string): Promise<void> {
  const list = await fetchChatMessagesForMatch(threadMatchUuid);
  getChatStore().setMessagesForMatch(partnerUserId, list);
  notify(partnerUserId);
}

function ensureRealtimeChannel(threadMatchUuid: string, partnerUserId: string): () => void {
  const prev = threadRealtimeRefCount.get(threadMatchUuid) ?? 0;
  threadRealtimeRefCount.set(threadMatchUuid, prev + 1);

  if (prev === 0) {
    const entry: ThreadRealtimeEntry = { partnerUserId, channel: null, cancelled: false };
    threadRealtimeByThreadId.set(threadMatchUuid, entry);
    void startThreadRealtime(threadMatchUuid, entry);
  }

  return () => {
    const n = (threadRealtimeRefCount.get(threadMatchUuid) ?? 1) - 1;
    if (n <= 0) {
      threadRealtimeRefCount.delete(threadMatchUuid);
      const entry = threadRealtimeByThreadId.get(threadMatchUuid);
      threadRealtimeByThreadId.delete(threadMatchUuid);
      if (entry) {
        entry.cancelled = true;
        if (entry.channel) {
          void supabase.removeChannel(entry.channel);
        }
      }
    } else {
      threadRealtimeRefCount.set(threadMatchUuid, n);
    }
  };
}

/**
 * Subscribe to updates for a conversation keyed by partner user id.
 * With `threadMatchUuid`, loads from Supabase and subscribes to Realtime.
 */
export function subscribeToMatchChat(
  partnerUserId: string,
  callback: (data: MatchChatUpdate) => void,
  options?: ChatServiceOptions
): Unsubscribe {
  if (!listeners.has(partnerUserId)) {
    listeners.set(partnerUserId, new Set());
  }
  listeners.get(partnerUserId)!.add(callback);

  const threadId = options?.threadMatchUuid;
  const detachRealtime = threadId ? ensureRealtimeChannel(threadId, partnerUserId) : null;

  notify(partnerUserId);

  return () => {
    const set = listeners.get(partnerUserId);
    if (set) {
      set.delete(callback);
      if (set.size === 0) listeners.delete(partnerUserId);
    }
    detachRealtime?.();
  };
}

/** Snapshot for initial render (partner user id key). */
export function getMatchChat(partnerUserId: string): MatchChatUpdate {
  const chat = getChatStore();
  const matches = getMatchesStore();
  const messages = chat.getMessagesForMatch(partnerUserId);
  const preview = matches.getConversationPreview(partnerUserId);
  return {
    matchId: partnerUserId,
    messages,
    lastMessage: preview.lastMessage,
    unreadCount: preview.unreadCount,
    lastMessageAt: preview.lastMessageAt,
  };
}

/**
 * Send: optimistic local update; Supabase path persists and reconciles message id.
 */
export function sendMessage(
  partnerUserId: string,
  currentUserId: string,
  input: SendMessageInput,
  options?: ChatServiceOptions & { simulateFailure?: boolean }
): Promise<void> {
  const chat = getChatStore();
  const text = input.text?.trim() ?? '';
  const threadId = options?.threadMatchUuid;

  if (!text) {
    return Promise.resolve();
  }

  if (!threadId) {
    const msg = chat.sendMessage(partnerUserId, currentUserId, text);
    notify(partnerUserId);
    return new Promise((resolve, reject) => {
      const delay = options?.simulateFailure ? 200 : 400;
      setTimeout(() => {
        if (options?.simulateFailure) {
          chat.removeMessage(partnerUserId, msg.id);
          notify(partnerUserId);
          reject(new Error('Send failed (simulated)'));
        } else {
          notify(partnerUserId);
          resolve();
        }
      }, delay);
    });
  }

  if (options?.simulateFailure) {
    const msg = chat.sendMessage(partnerUserId, currentUserId, text);
    notify(partnerUserId);
    chat.removeMessage(partnerUserId, msg.id);
    notify(partnerUserId);
    return Promise.reject(new Error('Send failed (simulated)'));
  }

  const optim = chat.sendMessage(partnerUserId, currentUserId, text);
  notify(partnerUserId);

  return insertChatMessage(threadId, text)
    .then((row) => {
      chat.replaceMessageId(partnerUserId, optim.id, row.id, {
        timestamp: new Date(row.created_at),
        isRead: Boolean(row.is_read),
      });
      notify(partnerUserId);
    })
    .catch((e) => {
      chat.removeMessage(partnerUserId, optim.id);
      notify(partnerUserId);
      throw e;
    });
}

export function markMatchRead(
  partnerUserId: string,
  currentUserId: string,
  options?: ChatServiceOptions
): void {
  const chat = getChatStore();
  chat.markMatchMessagesRead(partnerUserId, currentUserId);
  notify(partnerUserId);
  const threadId = options?.threadMatchUuid;
  if (threadId) {
    void markReceivedChatMessagesRead(threadId).then(() => {
      void loadThreadFromServer(threadId, partnerUserId).catch(() => {
        /* local state already marked read */
      });
    });
  }
}

export function toMatchChat(update: MatchChatUpdate): MatchChat {
  return {
    matchId: update.matchId,
    messages: update.messages,
    unreadCount: update.unreadCount,
    lastMessage: update.lastMessage,
  };
}
