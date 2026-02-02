/**
 * MatchChatScreen – Reusable bubble chat UI for a single match.
 * Uses data model from chatTypes.ts. FlatList, day headers, media fullscreen, input bar.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Image,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ListRenderItem,
} from 'react-native';
import type { Message, MatchChat } from '../types/chatTypes';
import { theme } from '../theme';
import * as chatService from '../services/chatService';

const BUBBLE_MAX_WIDTH = '80%';

// -----------------------------------------------------------------------------
// Helpers: time grouping
// -----------------------------------------------------------------------------

function getTimeGroupKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.getTime() === today.getTime()) return 'today';
  if (d.getTime() === yesterday.getTime()) return 'yesterday';
  return d.toISOString().slice(0, 10);
}

function getTimeGroupLabel(key: string): string {
  if (key === 'today') return 'Today';
  if (key === 'yesterday') return 'Yesterday';
  const d = new Date(key);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : key;
}

function formatMessageTime(date: Date): string {
  return new Date(date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

type ListItem =
  | { type: 'date'; key: string; label: string }
  | { type: 'message'; key: string; message: Message };

function buildListItems(messages: Message[]): ListItem[] {
  const sorted = [...messages].sort((a, b) => {
    const ta = a.timestamp != null ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp != null ? new Date(b.timestamp).getTime() : 0;
    return ta - tb;
  });
  const items: ListItem[] = [];
  let lastKey = '';
  for (const m of sorted) {
    const mDate = m.timestamp != null ? new Date(m.timestamp) : new Date();
    const key = Number.isFinite(mDate.getTime()) ? getTimeGroupKey(mDate) : 'today';
    if (key !== lastKey) {
      lastKey = key;
      items.push({ type: 'date', key: `date-${key}`, label: getTimeGroupLabel(key) });
    }
    items.push({ type: 'message', key: m.id, message: m });
  }
  return items;
}

// -----------------------------------------------------------------------------
// DayHeader
// -----------------------------------------------------------------------------

export interface DayHeaderProps {
  label: string;
}

export const DayHeader: React.FC<DayHeaderProps> = ({ label }) => (
  <View style={styles.dayHeaderWrap}>
    <Text style={styles.dayHeaderText}>{label}</Text>
  </View>
);

// -----------------------------------------------------------------------------
// ChatBubble
// -----------------------------------------------------------------------------

export interface ChatBubbleProps {
  message: Message;
  isMe: boolean;
  onImagePress?: (imageUrl: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isMe, onImagePress }) => {
  const timeStr = formatMessageTime(new Date(message.timestamp));
  const readReceipt = isMe ? (message.isRead ? '✓✓' : '✓') : null;

  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
      <View
        style={[
          styles.bubble,
          isMe ? styles.bubbleMe : styles.bubbleThem,
          isMe ? styles.bubbleTailMe : styles.bubbleTailThem,
        ]}
      >
        {message.imageUrl ? (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => onImagePress?.(message.imageUrl!)}
          >
            <Image
              source={{ uri: message.imageUrl }}
              style={styles.bubbleImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : null}
        {message.text ? (
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{message.text}</Text>
        ) : null}
        <View style={styles.bubbleFooter}>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{timeStr}</Text>
          {readReceipt ? (
            <Text style={[styles.readReceipt, isMe && styles.readReceiptMe]}>{readReceipt}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

// -----------------------------------------------------------------------------
// ImageModal
// -----------------------------------------------------------------------------

export interface ImageModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ visible, imageUrl, onClose }) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableOpacity
      style={styles.modalBackdrop}
      activeOpacity={1}
      onPress={onClose}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.fullscreenImage}
          resizeMode="contain"
        />
      ) : null}
    </TouchableOpacity>
  </Modal>
);

// -----------------------------------------------------------------------------
// MatchChatScreen
// -----------------------------------------------------------------------------

/** Use chatService: pass matchId + currentUserId. Real-time updates and optimistic send. */
export interface MatchChatScreenServiceProps {
  matchId: string;
  currentUserId: string;
  /** Optional: simulate send failure for testing (e.g. __DEV__). */
  simulateSendFailure?: boolean;
}

/** Controlled mode: parent owns data and onSendMessage. */
export interface MatchChatScreenControlledProps {
  matchChat: MatchChat;
  currentUserId: string;
  onSendMessage: (text: string, imageUrl?: string) => void;
}

export type MatchChatScreenProps = MatchChatScreenServiceProps | MatchChatScreenControlledProps;

function isServiceProps(props: MatchChatScreenProps): props is MatchChatScreenServiceProps {
  return 'matchId' in props && typeof (props as MatchChatScreenServiceProps).matchId === 'string';
}

export const MatchChatScreen: React.FC<MatchChatScreenProps> = (props) => {
  const currentUserId = props.currentUserId;
  const [inputText, setInputText] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const listRef = useRef<FlatList<ListItem>>(null);
  const prevMessageCountRef = useRef(0);

  const isService = isServiceProps(props);
  const matchId = isService ? props.matchId : undefined;

  const [serviceMatchChat, setServiceMatchChat] = useState<MatchChat | null>(
    isService && matchId ? chatService.toMatchChat(chatService.getMatchChat(matchId)) : null
  );

  const matchChat: MatchChat = isService
    ? (serviceMatchChat ?? { matchId: matchId!, messages: [], unreadCount: 0 })
    : props.matchChat;

  const messages = matchChat.messages ?? [];
  const listItems = useMemo(() => buildListItems(messages), [messages]);

  useEffect(() => {
    if (!isService || !matchId) return;
    const unsub = chatService.subscribeToMatchChat(matchId, (update) => {
      setServiceMatchChat(chatService.toMatchChat(update));
    });
    return unsub;
  }, [isService, matchId]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    if (isService && matchId) {
      chatService
        .sendMessage(matchId, currentUserId, { text }, { simulateFailure: props.simulateSendFailure })
        .then(() => setInputText(''))
        .catch(() => {
          // Optimistic message was rolled back by service; UI already updated via subscription
        });
      return;
    }

    (props as MatchChatScreenControlledProps).onSendMessage(text);
    setInputText('');
  }, [inputText, isService, matchId, currentUserId, props]);

  const renderItem: ListRenderItem<ListItem> = useCallback(
    ({ item }) => {
      if (item.type === 'date') {
        return <DayHeader label={item.label} />;
      }
      const isMe = item.message.senderId === currentUserId;
      return (
        <ChatBubble
          message={item.message}
          isMe={isMe}
          onImagePress={setFullscreenImage}
        />
      );
    },
    [currentUserId]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={listRef}
        data={listItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        inverted
        contentContainerStyle={[styles.listContent, listItems.length === 0 && styles.listContentEmpty]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          listItems.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No messages yet. Say hi!</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={theme.colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
        />
        <Pressable
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </Pressable>
      </View>

      <ImageModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />
    </KeyboardAvoidingView>
  );
};

export default MatchChatScreen;

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  listContent: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyWrap: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  dayHeaderWrap: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  dayHeaderText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  bubbleRowThem: {
    justifyContent: 'flex-start',
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: BUBBLE_MAX_WIDTH,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  bubbleThem: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 4,
  },
  bubbleTailThem: {},
  bubbleMe: {
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 4,
  },
  bubbleTailMe: {},
  bubbleText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
  },
  bubbleTextMe: {
    color: theme.colors.textInverse,
  },
  bubbleImage: {
    width: 200,
    height: 200,
    borderRadius: theme.borderRadius.base,
    marginBottom: theme.spacing.xs,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.xs,
    marginTop: 2,
  },
  bubbleTime: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  bubbleTimeMe: {
    color: theme.colors.textInverse + 'cc',
  },
  readReceipt: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  readReceiptMe: {
    color: theme.colors.textInverse + 'cc',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
  },
  sendBtn: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
