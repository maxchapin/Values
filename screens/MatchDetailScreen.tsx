/**
 * Match Detail Screen – Tabbed Chat + Profile
 * [Chat] [Profile] segmented control; Chat = real-time messages, Profile = Discovery-style read-only card.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../store/userStore';
import { useMatchesStore } from '../store/matchesStore';
import { useChatStore } from '../store/chatStore';
import { MatchChatScreen } from '../components/MatchChatScreen';
import { ProfileCard } from '../components/ProfileCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { ReportUserModal } from '../components/ReportUserModal';
import * as chatService from '../services/chatService';
import { fetchMatchThreadIdForPair } from '../services/supabaseMatching';
import { insertUserBlock, insertUserReport, type ReportReason } from '../services/supabaseSafety';
import { trackUserBlocked, trackUserReported } from '../services/analytics';
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
  const discoverSwipeMode = useMatchesStore((s) => s.discoverSwipeMode);
  const mutualMatches = useMatchesStore((s) => s.mutualMatches);
  const rankedDiscoverPool = useMatchesStore((s) => s.rankedDiscoverPool);
  const likedUserIds = useMatchesStore((s) => s.likedUserIds);
  const matchIdByPartnerUserId = useMatchesStore((s) => s.matchIdByPartnerUserId);
  const loadMatches = useMatchesStore((s) => s.loadMatches);
  const unmatchUser = useMatchesStore((s) => s.unmatchUser);
  const filters = useMatchesStore((s) => s.filters);
  const seedMockMessages = useChatStore((s) => s.seedMockMessages);
  const setMessagesForMatch = useChatStore((s) => s.setMessagesForMatch);
  const [resolvedThreadId, setResolvedThreadId] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);

  const likedMatches = useMemo(() => {
    if (discoverSwipeMode === 'supabase') {
      return Array.isArray(mutualMatches) ? mutualMatches : [];
    }
    if (!Array.isArray(rankedDiscoverPool) || !Array.isArray(likedUserIds)) return [];
    if (rankedDiscoverPool.length === 0 || likedUserIds.length === 0) return [];
    return rankedDiscoverPool.filter((match) => {
      if (!match?.user?.id) return false;
      return likedUserIds.includes(match.user.id);
    });
  }, [discoverSwipeMode, mutualMatches, rankedDiscoverPool, likedUserIds]);

  const match = useMemo<Match | undefined>(
    () => likedMatches.find((m) => m.user.id === matchUserId),
    [likedMatches, matchUserId]
  );
  const otherUser = match?.user;
  const otherUserId = otherUser?.id ?? matchUserId ?? '';
  const otherName = otherUser?.name ?? 'Match';

  const threadMatchUuid =
    discoverSwipeMode === 'supabase'
      ? (matchIdByPartnerUserId[matchUserId] ?? resolvedThreadId ?? undefined)
      : undefined;

  useEffect(() => {
    if (discoverSwipeMode !== 'supabase' || !matchUserId || !currentUserId) {
      setResolvedThreadId(null);
      return;
    }
    const fromStore = matchIdByPartnerUserId[matchUserId];
    if (fromStore) {
      setResolvedThreadId(fromStore);
      return;
    }
    let cancelled = false;
    void fetchMatchThreadIdForPair(currentUserId, matchUserId).then((id) => {
      if (!cancelled && id) setResolvedThreadId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [discoverSwipeMode, matchUserId, currentUserId, matchIdByPartnerUserId]);

  useFocusEffect(
    useCallback(() => {
      if (!matchUserId || !currentUserId) return;
      if (discoverSwipeMode === 'mock' && __DEV__) {
        const msgs = useChatStore.getState().getMessagesForMatch(matchUserId);
        if (msgs.length === 0) {
          seedMockMessages(matchUserId, currentUserId, otherUserId);
        }
      }
      const tid =
        discoverSwipeMode === 'supabase'
          ? (matchIdByPartnerUserId[matchUserId] ?? resolvedThreadId ?? undefined)
          : undefined;
      chatService.markMatchRead(matchUserId, currentUserId, { threadMatchUuid: tid });
    }, [
      matchUserId,
      currentUserId,
      otherUserId,
      discoverSwipeMode,
      seedMockMessages,
      matchIdByPartnerUserId,
      resolvedThreadId,
    ])
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

  const runBlockAndLeave = useCallback(async () => {
    if (!matchUserId || !currentUserId) return;
    try {
      await insertUserBlock(currentUserId, matchUserId);
      trackUserBlocked(matchUserId, { source: 'match_detail' });
      setMessagesForMatch(matchUserId, []);
      try {
        await unmatchUser(matchUserId);
      } catch {
        /* unmatch optional if no server row */
      }
      if (currentUserId) {
        await loadMatches(currentUserId, filters);
      }
      navigation.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not block user';
      Alert.alert('Block failed', msg);
    }
  }, [
    matchUserId,
    currentUserId,
    setMessagesForMatch,
    unmatchUser,
    loadMatches,
    filters,
    navigation,
  ]);

  const openSafetyMenu = useCallback(() => {
    Alert.alert('Safety', undefined, [
      { text: 'Report', onPress: () => setReportVisible(true) },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Block this person?',
            'You won’t see each other in Discover or Matches. You can’t undo this here.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Block', style: 'destructive', onPress: () => void runBlockAndLeave() },
            ]
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [runBlockAndLeave]);

  const handleReportSubmit = useCallback(
    async (reason: ReportReason, details: string) => {
      if (!matchUserId || !currentUserId) return;
      await insertUserReport({
        reporterId: currentUserId,
        reportedUserId: matchUserId,
        reason,
        details,
        matchId: threadMatchUuid ?? null,
      });
      trackUserReported(matchUserId, { reason, source: 'match_detail' });
    },
    [matchUserId, currentUserId, threadMatchUuid]
  );

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
        <TouchableOpacity
          onPress={openSafetyMenu}
          style={styles.headerSafetyBtn}
          accessibilityLabel="Safety and report"
          accessibilityRole="button"
        >
          <Text style={styles.headerSafetyBtnText}>Safety</Text>
        </TouchableOpacity>
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
          <MatchChatScreen
            matchId={matchUserId}
            currentUserId={currentUserId}
            threadMatchUuid={threadMatchUuid}
          />
        </View>
      ) : (
        /* TAB 2: Profile – full-height Discovery card (read-only) + fixed Continue Chat button */
        <View style={styles.profileContainer}>
          <View style={styles.profileCardWrap}>
            <ProfileCard
              user={otherUser}
              sharedValueIds={sharedValueIds}
              similarityScore={match.similarityScore}
              sharedValuesCount={match.sharedValuesCount}
              explanationLines={explanationLines}
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
      <ReportUserModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={handleReportSubmit}
        reportedDisplayName={displayName}
      />
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
  headerSafetyBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    minWidth: 52,
    alignItems: 'flex-end',
  },
  headerSafetyBtnText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
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
