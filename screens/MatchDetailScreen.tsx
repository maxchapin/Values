/**
 * Match Detail Screen
 * Profile strip at top + MatchChatScreen (real-time, optimistic send, mark-as-read on open).
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../store/userStore';
import { useMatchesStore } from '../store/matchesStore';
import { useChatStore } from '../store/chatStore';
import { MatchChatScreen } from '../components/MatchChatScreen';
import * as chatService from '../services/chatService';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

type MatchDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'MatchDetail'>;

const HEADER_AVATAR_SIZE = 36;

export const MatchDetailScreen: React.FC<MatchDetailScreenProps> = () => {
  const route = useRoute<MatchDetailScreenProps['route']>();
  const navigation = useNavigation<MatchDetailScreenProps['navigation']>();
  const { matchUserId } = route.params ?? {};

  const currentUser = useUserStore((s) => s.currentUser);
  const currentUserId = currentUser?.id ?? '';
  const likedMatches = useMatchesStore((s) => s.getLikedMatches());
  const seedMockMessages = useChatStore((s) => s.seedMockMessages);

  const match = useMemo(
    () => likedMatches.find((m) => m.user.id === matchUserId),
    [likedMatches, matchUserId]
  );
  const otherUser = match?.user;
  const otherUserId = otherUser?.id ?? matchUserId ?? '';
  const otherName = otherUser?.name ?? 'Match';
  const otherPhoto = Array.isArray(otherUser?.photos) && otherUser.photos[0] ? otherUser.photos[0] : null;

  useFocusEffect(
    useCallback(() => {
      if (!matchUserId || !currentUserId) return;
      const msgs = useChatStore.getState().getMessagesForMatch(matchUserId);
      if (msgs.length === 0) {
        seedMockMessages(matchUserId, currentUserId, otherUserId);
      }
      chatService.markMatchRead(matchUserId, currentUserId);
    }, [matchUserId, currentUserId, otherUserId, seedMockMessages])
  );

  if (!matchUserId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Missing match. Go back.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header: back + profile strip */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerProfile}>
          {otherPhoto ? (
            <Image source={{ uri: otherPhoto }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
              <Text style={styles.headerAvatarText}>{otherName.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.headerName} numberOfLines={1}>
            {otherName}
            {otherUser?.age != null ? `, ${otherUser.age}` : ''}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Real-time chat via chatService; optimistic send; mark-as-read on open handled in useFocusEffect */}
      <MatchChatScreen matchId={matchUserId} currentUserId={currentUserId} />
    </SafeAreaView>
  );
};

export default MatchDetailScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  backBtnText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
    minWidth: 0,
  },
  headerAvatar: {
    width: HEADER_AVATAR_SIZE,
    height: HEADER_AVATAR_SIZE,
    borderRadius: HEADER_AVATAR_SIZE / 2,
    marginRight: theme.spacing.sm,
  },
  headerAvatarPlaceholder: {
    backgroundColor: theme.colors.primaryLight + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  headerName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  headerSpacer: {
    width: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
});
