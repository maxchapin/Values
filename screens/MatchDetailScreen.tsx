/**
 * Match Detail Screen – Tabbed Chat + Profile
 * [Chat] [Profile] segmented control; Chat = real-time messages, Profile = Discovery-style read-only card.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../store/userStore';
import { useMatchesStore } from '../store/matchesStore';
import { useChatStore } from '../store/chatStore';
import { MatchChatScreen } from '../components/MatchChatScreen';
import { DiscoverProfileCard } from '../components/DiscoverProfileCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import * as chatService from '../services/chatService';
import { formatExplanationLines } from '../services/matchingModel';
import type { RootStackParamList } from '../navigation/types';
import type { Match } from '../types/match';
import { theme } from '../theme';

type MatchDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'MatchDetail'>;

type TabIndex = 0 | 1; // 0 = Chat, 1 = Profile

export const MatchDetailScreen: React.FC<MatchDetailScreenProps> = () => {
  const route = useRoute<MatchDetailScreenProps['route']>();
  const navigation = useNavigation<MatchDetailScreenProps['navigation']>();
  const { matchUserId } = route.params ?? {};

  const [tab, setTab] = useState<TabIndex>(0);

  const currentUser = useUserStore((s) => s.currentUser);
  const currentUserId = currentUser?.id ?? '';
  const availableMatches = useMatchesStore((s) => s.availableMatches);
  const likedUserIds = useMatchesStore((s) => s.likedUserIds);
  const seedMockMessages = useChatStore((s) => s.seedMockMessages);

  const likedMatches = useMemo(() => {
    if (!Array.isArray(availableMatches) || !Array.isArray(likedUserIds)) return [];
    if (availableMatches.length === 0 || likedUserIds.length === 0) return [];
    return availableMatches.filter((match) => {
      if (!match?.user?.id) return false;
      return likedUserIds.includes(match.user.id);
    });
  }, [availableMatches, likedUserIds]);

  const match = useMemo<Match | undefined>(
    () => likedMatches.find((m) => m.user.id === matchUserId),
    [likedMatches, matchUserId]
  );
  const otherUser = match?.user;
  const otherUserId = otherUser?.id ?? matchUserId ?? '';
  const otherName = otherUser?.name ?? 'Match';

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

  // Missing route param
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

  // Match deleted or no longer in liked list
  if (!match || !otherUser) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Match</Text>
        </View>
        <EmptyState
          icon="💬"
          title="Match no longer available"
          message="This match may have been removed or is no longer in your list."
          actionLabel="Back to Matches"
          onAction={() => navigation.goBack()}
          fullScreen={false}
        />
      </SafeAreaView>
    );
  }

  const sharedValueIds = useMemo(() => new Set(match.sharedValues ?? []), [match.sharedValues]);
  const explanationLines = useMemo(
    () => (match.valuesExplanation ? formatExplanationLines(match.valuesExplanation) : undefined),
    [match.valuesExplanation]
  );

  const displayName = otherName;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top bar: back + match name */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerName} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      {/* Tabs: [Chat] [Profile] */}
      <View style={styles.tabsBar}>
        <Pressable
          style={[styles.segment, tab === 0 && styles.segmentActive]}
          onPress={() => setTab(0)}
        >
          <Text style={[styles.segmentText, tab === 0 && styles.segmentTextActive]}>Chat</Text>
        </Pressable>
        <Pressable
          style={[styles.segment, tab === 1 && styles.segmentActive]}
          onPress={() => setTab(1)}
        >
          <Text style={[styles.segmentText, tab === 1 && styles.segmentTextActive]}>Profile</Text>
        </Pressable>
      </View>

      {tab === 0 ? (
        /* TAB 1: Chat – current implementation, ~80% height feel via flex */
        <View style={styles.chatContainer}>
          <MatchChatScreen matchId={matchUserId} currentUserId={currentUserId} />
        </View>
      ) : (
        /* TAB 2: Profile – full-height Discovery card (read-only) + fixed Continue Chat button */
        <View style={styles.profileContainer}>
          <View style={styles.profileCardWrap}>
            <DiscoverProfileCard
              candidate={otherUser}
              sharedValueIds={sharedValueIds}
              similarityScore={match.similarityScore}
              sharedValuesCount={match.sharedValuesCount}
              explanationLines={explanationLines}
              mode="other"
              scrollViewProps={{
                contentContainerStyle: { paddingBottom: theme.spacing.lg },
              }}
            />
          </View>
          <View style={styles.continueChatWrap}>
            <PrimaryButton
              title="Continue Chat"
              onPress={() => setTab(0)}
              style={styles.continueChatBtn}
            />
          </View>
        </View>
      )}
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
  headerName: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 52,
  },
  tabsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.textInverse,
  },
  chatContainer: {
    flex: 1,
    minHeight: 0,
  },
  profileContainer: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  profileCardWrap: {
    flex: 1,
    minHeight: 0,
  },
  continueChatWrap: {
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  continueChatBtn: {
    minHeight: 50,
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
