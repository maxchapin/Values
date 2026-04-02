/**
 * Supabase-backed chat: `chat_messages` rows keyed by `match_id` → `public.matches.id`.
 */

import { supabase } from './supabase';
import type { Message } from '../types/chatTypes';

export interface ChatMessageRow {
  id: string;
  match_id: string;
  sender_id: string;
  message_type: string;
  content: string;
  created_at: string;
  is_read: boolean | null;
}

function rowToMessage(row: ChatMessageRow): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    text: row.content,
    timestamp: new Date(row.created_at),
    isRead: Boolean(row.is_read),
  };
}

export function chatMessageRowToMessage(row: unknown): Message | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = r.id;
  const sender_id = r.sender_id;
  const content = r.content;
  const created_at = r.created_at;
  const is_read = r.is_read;
  if (typeof id !== 'string' || typeof sender_id !== 'string' || typeof content !== 'string') {
    return null;
  }
  const ts = typeof created_at === 'string' ? created_at : '';
  return {
    id,
    senderId: sender_id,
    text: content,
    timestamp: new Date(ts),
    isRead: Boolean(is_read),
  };
}

export async function fetchChatMessagesForMatch(threadMatchId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, match_id, sender_id, message_type, content, created_at, is_read')
    .eq('match_id', threadMatchId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load messages');
  }

  const rows = (data ?? []) as ChatMessageRow[];
  return rows.map(rowToMessage);
}

export async function insertChatMessage(threadMatchId: string, content: string): Promise<ChatMessageRow> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Empty message');
  }

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user?.id) {
    throw new Error(userErr?.message || 'Not signed in');
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      match_id: threadMatchId,
      sender_id: userRes.user.id,
      message_type: 'text',
      content: trimmed,
    })
    .select('id, match_id, sender_id, message_type, content, created_at, is_read')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to send message');
  }

  return data as ChatMessageRow;
}

/** Mark all messages from the other participant in this thread as read (RLS: only received rows). */
export async function markReceivedChatMessagesRead(threadMatchId: string): Promise<void> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user?.id) {
    if (__DEV__) console.warn('[supabaseChat] markReceived: no user', userErr?.message);
    return;
  }
  const me = userRes.user.id;

  const { error: updErr } = await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('match_id', threadMatchId)
    .neq('sender_id', me)
    .eq('is_read', false);

  if (updErr && __DEV__) {
    console.warn('[supabaseChat] markReceivedChatMessagesRead:', updErr.message);
  }
}
