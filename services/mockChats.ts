/**
 * Mock chat data for 1:1 match conversations.
 * Exports sample MatchChat objects for development and testing.
 */

import type { MatchChat, Message } from '../types/chatTypes';

const PREVIEW_MAX_LEN = 40;

function lastMessagePreview(messages: Message[], maxLen = PREVIEW_MAX_LEN): string {
  const sorted = [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  for (let i = sorted.length - 1; i >= 0; i--) {
    const m = sorted[i];
    const content = m.text ?? (m.imageUrl ? '📷 Photo' : '');
    if (content) {
      return content.length > maxLen ? content.slice(0, maxLen - 1) + '…' : content;
    }
  }
  return '';
}

function countUnread(messages: Message[], otherUserId: string): number {
  return messages.filter((m) => m.senderId === otherUserId && !m.isRead).length;
}

// Current user id used in mock (e.g. "me" or "u7"); matches from "other" user's perspective are keyed by their id.
const CURRENT_USER_ID = 'u7';

const now = Date.now();
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * oneHour;
const oneWeek = 7 * oneDay;

/** Match 1: Sarah (u1) – mix of text and image, some unread */
const match1Messages: Message[] = [
  {
    id: 'm1-1',
    senderId: 'u1',
    text: 'Hey! Love your values — we have a lot in common.',
    timestamp: new Date(now - oneWeek),
    isRead: true,
  },
  {
    id: 'm1-2',
    senderId: CURRENT_USER_ID,
    text: 'Thanks! Same here, your profile stood out.',
    timestamp: new Date(now - oneWeek + oneHour),
    isRead: true,
  },
  {
    id: 'm1-3',
    senderId: 'u1',
    text: 'Would you want to grab coffee sometime?',
    timestamp: new Date(now - oneWeek + 2 * oneHour),
    isRead: true,
  },
  {
    id: 'm1-4',
    senderId: CURRENT_USER_ID,
    text: 'Yes, I’d like that! How’s this weekend?',
    timestamp: new Date(now - oneWeek + 3 * oneHour),
    isRead: true,
  },
  {
    id: 'm1-5',
    senderId: 'u1',
    text: 'Saturday works. I’ll send you a spot.',
    timestamp: new Date(now - oneDay),
    isRead: true,
  },
  {
    id: 'm1-6',
    senderId: 'u1',
    text: 'Here’s a photo of the place 😊',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    timestamp: new Date(now - oneDay + 30 * 60 * 1000),
    isRead: false,
  },
];

/** Match 2: Alex (u2) – mostly text, all read, last week */
const match2Messages: Message[] = [
  {
    id: 'm2-1',
    senderId: 'u2',
    text: 'Hi! Saw we both care about Growth and Authenticity.',
    timestamp: new Date(now - oneWeek - oneDay),
    isRead: true,
  },
  {
    id: 'm2-2',
    senderId: CURRENT_USER_ID,
    text: 'Yeah, those are big ones for me too.',
    timestamp: new Date(now - oneWeek - oneDay + 2 * oneHour),
    isRead: true,
  },
  {
    id: 'm2-3',
    senderId: 'u2',
    text: 'Maybe we could do a hike sometime?',
    timestamp: new Date(now - oneWeek),
    isRead: true,
  },
  {
    id: 'm2-4',
    senderId: CURRENT_USER_ID,
    text: 'Down for that! Let me know when you’re free.',
    timestamp: new Date(now - oneWeek + oneHour),
    isRead: true,
  },
];

/** Match 3: Jordan (u3) – text + image, unread from them today */
const match3Messages: Message[] = [
  {
    id: 'm3-1',
    senderId: 'u3',
    text: 'Your prompts made me laugh 😄',
    timestamp: new Date(now - 2 * oneDay),
    isRead: true,
  },
  {
    id: 'm3-2',
    senderId: CURRENT_USER_ID,
    text: 'Haha glad to hear it!',
    timestamp: new Date(now - 2 * oneDay + oneHour),
    isRead: true,
  },
  {
    id: 'm3-3',
    senderId: 'u3',
    text: 'This is from my last trip',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    timestamp: new Date(now - oneDay),
    isRead: true,
  },
  {
    id: 'm3-4',
    senderId: 'u3',
    text: 'Good morning! Hope you have a great day 🌞',
    timestamp: new Date(now - 2 * oneHour),
    isRead: false,
  },
  {
    id: 'm3-5',
    senderId: 'u3',
    text: 'We should plan something soon!',
    timestamp: new Date(now - oneHour),
    isRead: false,
  },
];

/** Build MatchChat with consistent unreadCount and lastMessage */
function buildMatchChat(matchId: string, messages: Message[]): MatchChat {
  const unreadCount = countUnread(messages, matchId);
  const lastMessage = lastMessagePreview(messages);
  return {
    matchId,
    messages,
    unreadCount,
    lastMessage: lastMessage || undefined,
  };
}

/** Sample MatchChats for 3 matches (keyed by other user id). */
export const mockChats: MatchChat[] = [
  buildMatchChat('u1', match1Messages),
  buildMatchChat('u2', match2Messages),
  buildMatchChat('u3', match3Messages),
];

/** Get mock MatchChat by match (other user) id. */
export function getMockChatByMatchId(matchId: string): MatchChat | undefined {
  return mockChats.find((c) => c.matchId === matchId);
}
