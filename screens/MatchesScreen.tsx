import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatchesStore } from '../store/matchesStore';
import { useUserStore } from '../store/userStore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { trackScreenView } from '../services/analytics';
import { ScreenContainer } from '../components/ScreenContainer';
import { formatExplanationOneLine } from '../services/matchingModel';
import { Match } from '../types/match';
import { theme } from '../theme';
import { ROUTES, type MainTabParamList } from '../navigation/types';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import type { ConversationPreviewData } from '../store/matchesStore';

const AVATAR_SIZE = 60;
const MESSAGE_PREVIEW_MAX = 40;
/** Used by getItemLayout for FlatList memory optimization. */
const MATCH_ROW_HEIGHT = 88;

/** Props for a single match row: match + conversation preview (MatchChat-equivalent). */
export interface MatchRowProps {
  match: Match;
  conversationPreview: ConversationPreviewData;
  onPress: () => void;
  onUnmatch: (match: Match, userName: string) => void;
}

/** Single match row: name, age, score, latest message preview (40 chars), relative time, unread badge. */
export const MatchRow: React.FC<MatchRowProps> = ({
  match,
  conversationPreview,
  onPress,
  onUnmatch,
}) => {
  const { user, similarityScore, valuesExplanation } = match;
  const userId = user.id;
  const name = user.name || 'Unknown';
  const age = user.age != null ? user.age : '?';
  const score = typeof similarityScore === 'number' ? similarityScore : 0;
  const oneLineExplanation = valuesExplanation ? formatExplanationOneLine(valuesExplanation) : '';
  const { lastMessage, unreadCount, lastMessageAt } = conversationPreview;
  const messagePreview =
    lastMessage && lastMessage.length > MESSAGE_PREVIEW_MAX
      ? lastMessage.slice(0, MESSAGE_PREVIEW_MAX - 1) + '…'
      : lastMessage ?? '';
  const relativeTime = lastMessageAt != null ? formatRelativeTime(lastMessageAt) : null;
  const photoUri = Array.isArray(user.photos) && user.photos[0] ? user.photos[0] : null;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      android_ripple={{ color: theme.colors.backgroundSecondary }}
    >
      <View style={styles.cardInner}>
        <View style={styles.left}>
          <View style={styles.avatarWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarPlaceholderText}>{name.charAt(0)}</Text>
              </View>
            )}
          </View>
          <View style={styles.main}>
            <View style={styles.row1}>
              <Text style={styles.name} numberOfLines={1}>
                {`${name}, ${age}`}
              </Text>
              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>{score}%</Text>
              </View>
            </View>
            {/* 
            {oneLineExplanation ? (
              <Text style={styles.explanationLine} numberOfLines={1}>
                {oneLineExplanation}
              </Text>
            ) : null}
            */}
            {messagePreview ? (
              <Text style={styles.messagePreview} numberOfLines={1}>
                "{messagePreview}"
              </Text>
            ) : (
              <Text style={styles.messagePreview} numberOfLines={1}>
                {user.locationLabel ?? 'No messages yet'}
              </Text>
            )}
            {relativeTime ? (
              <Text style={styles.relativeTime} numberOfLines={1}>
                {relativeTime}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.actions}>
          <View style={styles.chatIconWrap}>
            <Text style={styles.chatIcon}>💬</Text>
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            style={styles.unmatchButton}
            onPress={(e) => {
              e.stopPropagation();
              onUnmatch(match, name);
            }}
            hitSlop={8}
          >
            <Text style={styles.unmatchText}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

export const MatchesScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Matches'>>();
  const insets = useSafeAreaInsets();
  const currentUserId = useUserStore((s) => s.currentUser?.id ?? null);
  const availableMatches = useMatchesStore((s) => s.availableMatches);
  const likedUserIds = useMatchesStore((s) => s.likedUserIds);
  const isLoading = useMatchesStore((s) => s.isLoading);
  const error = useMatchesStore((s) => s.error);
  const loadMatches = useMatchesStore((s) => s.loadMatches);
  const unmatchUser = useMatchesStore((s) => s.unmatchUser);
  const getConversationPreview = useMatchesStore((s) => s.getConversationPreview);
  const setConversationPreview = useMatchesStore((s) => s.setConversationPreview);
  /** Subscribe so list re-renders when chat previews (lastMessage, unreadCount, lastMessageAt) change. */
  useMatchesStore((s) => s._conversationPreviews);
  const [refreshing, setRefreshing] = useState(false);
  const didLoadRef = useRef(false);

  // Guard: store may return undefined before ready when switching tabs
  const matches = Array.isArray(availableMatches) ? availableMatches : [];
  const likedIds = Array.isArray(likedUserIds) ? likedUserIds : [];

  const likedMatches = useMemo<Match[]>(() => {
    if (matches.length === 0 || likedIds.length === 0) return [];
    return matches.filter((match) => {
      const id = match?.user?.id;
      return !!id && likedIds.includes(id);
    });
  }, [matches, likedIds]);

  // Safe list for effects and render (never undefined)
  const safeLikedMatches = likedMatches ?? [];

  // Seed mock conversation previews for first 2 matches (demo)
  useEffect(() => {
    if (safeLikedMatches.length === 0) return;
    const [first, second] = safeLikedMatches;
    const oneHourAgo = Date.now() - 3600000;
    const yesterday = Date.now() - 86400000;
    if (first?.user?.id) {
      setConversationPreview(first.user.id, "Hey! Love your Growth value 🥰", 1, oneHourAgo);
    }
    if (second?.user?.id) {
      setConversationPreview(second.user.id, "Your Privacy value resonates", 0, yesterday);
    }
  }, [safeLikedMatches.length]);

  useEffect(() => {
    trackScreenView('Matches');
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      didLoadRef.current = false;
      return;
    }
    if (!didLoadRef.current && matches.length === 0 && !isLoading) {
      didLoadRef.current = true;
      loadMatches(currentUserId);
    }
  }, [currentUserId, matches.length, isLoading, loadMatches]);

  const onRefresh = async () => {
    if (!currentUserId) return;
    setRefreshing(true);
    await loadMatches(currentUserId);
    setRefreshing(false);
  };

  const handleOpenMatch = (matchUserId: string) => {
    // Reach root stack to push MatchDetail (we're inside MainApp tab).
    const root = navigation.getParent?.() as { navigate: (name: string, params: { matchUserId: string }) => void } | undefined;
    if (root) {
      root.navigate(ROUTES.MATCH_DETAIL, { matchUserId });
    } else {
      (navigation as { navigate: (name: string, params: { matchUserId: string }) => void }).navigate(ROUTES.MATCH_DETAIL, { matchUserId });
    }
  };

  const handleUnmatch = (match: Match, userName: string) => {
    const userId = match?.user?.id;
    if (!userId) return;
    Alert.alert(
      'Unmatch',
      `Remove ${userName} from your matches?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unmatch', style: 'destructive', onPress: () => unmatchUser(userId) },
      ]
    );
  };

  const renderMatchCard = ({ item: match }: { item: Match }): React.ReactElement | null => {
    if (!match || !match.user) return null;
    const userId = match.user.id;
    const preview: ConversationPreviewData = getConversationPreview(userId);
    return (
      <MatchRow
        match={match}
        conversationPreview={preview}
        onPress={() => handleOpenMatch(userId)}
        onUnmatch={handleUnmatch}
      />
    );
  };

  const ListHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + theme.spacing.xl, backgroundColor: theme.colors.headerBackground }]}>
      <Text style={styles.headerTitle}>Matches</Text>
      <Text style={styles.headerSubtitle}>
        {safeLikedMatches.length} match{safeLikedMatches.length !== 1 ? 'es' : ''}
      </Text>
    </View>
  );

  if (!currentUserId) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="🔒"
          title="Not signed in"
          message="Please sign up or log in to view matches."
        />
      </ScreenContainer>
    );
  }

  if (isLoading && safeLikedMatches.length === 0) {
    return <LoadingSpinner message="Loading matches..." />;
  }

  if (error) {
    return (
      <ScreenContainer headerBackgroundColor={theme.colors.headerBackground}>
        <View style={[styles.header, { paddingTop: insets.top + theme.spacing.xl, backgroundColor: theme.colors.headerBackground }]}>
          <Text style={styles.headerTitle}>Matches</Text>
          <Text style={styles.headerSubtitle}>Error</Text>
        </View>
        <View style={styles.emptyStateWrap}>
          <ErrorState
            message={error}
            actionLabel="Try Again"
            onAction={() => loadMatches(currentUserId)}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (safeLikedMatches.length === 0) {
    return (
      <ScreenContainer contentPadding={false} headerBackgroundColor={theme.colors.headerBackground}>
        <>
          <ListHeader />
          <View style={styles.emptyStateWrap}>
            <EmptyState
              icon="💕"
              title="No matches yet—keep exploring!"
              message="Start swiping in Discover. Your matches will appear here."
              actionLabel="Go to Discover"
              onAction={() => navigation.navigate(ROUTES.DISCOVER)}
            />
          </View>
        </>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentPadding={false} headerBackgroundColor={theme.colors.headerBackground}>
      <FlatList
        data={safeLikedMatches}
        renderItem={renderMatchCard}
        keyExtractor={(item) => item.user.id}
        ListHeaderComponent={ListHeader}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        initialNumToRender={5}
        getItemLayout={(_data, index) => ({ length: MATCH_ROW_HEIGHT, offset: (MATCH_ROW_HEIGHT + 1) * index, index })}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      />
    </ScreenContainer>
  );
};

export default MatchesScreen;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.headerBorder,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.headerTint,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.headerTintSecondary,
  },
  list: {
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingBottom: theme.spacing['2xl'],
  },
  card: {
    minHeight: 80,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    justifyContent: 'center',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  avatarWrap: {
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    flex: 1,
  },
  scorePill: {
    backgroundColor: theme.colors.primaryLight + '30',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary + '50',
  },
  scoreText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  explanationLine: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  messagePreview: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  relativeTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  chatIconWrap: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textInverse,
  },
  unmatchButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unmatchText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: AVATAR_SIZE + theme.spacing.md + theme.spacing.base,
  },
  emptyStateWrap: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
  },
});
