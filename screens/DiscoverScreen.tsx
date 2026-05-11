import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatchesStore } from '../store/matchesStore';
import { useUserStore } from '../store/userStore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useDebugAccess } from '../hooks/useDebugAccess';
import {
  trackScreenView,
  trackMatchLiked,
  trackMatchPassed,
  trackUserBlocked,
  trackUserReported,
} from '../services/analytics';
import { ScreenContainer } from '../components/ScreenContainer';
import { DiscoverActionBar } from '../components/DiscoverActionBar';
import { ProfileCard } from '../components/ProfileCard';
import { DiscoverSwipeCard } from '../components/DiscoverSwipeCard';
import { FiltersSheet, DEFAULT_AGE_RANGE, DEFAULT_RADIUS_MILES } from '../components/FiltersSheet';
import { FeedbackModal } from '../components/FeedbackModal';
import { ReportUserModal } from '../components/ReportUserModal';
import { insertUserBlock, insertUserReport, type ReportReason } from '../services/supabaseSafety';
import { formatExplanationLines } from '../services/matchingModel';
import { theme } from '../theme';
import {
  navigateToValuesEditorFromProfile,
  type NavigateToValuesEditorNav,
} from '../navigation/navigateToValuesEditor';

export const DiscoverScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentUser } = useUserStore();
  const {
    availableMatches,
    rankedDiscoverPoolLength,
    isLoading,
    error,
    filters,
    loadMatches,
    getCurrentMatch,
    likeUser,
    passUser,
    setFilters,
    discoverSwipeMode,
    discoverMode,
  } = useMatchesStore();

  // Guard: store may not have availableMatches on first paint when switching tabs
  const matches = availableMatches ?? [];

  const [showFilters, setShowFilters] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const lastLoadedUserIdRef = useRef<string | null>(null);
  const didInitialLoadRef = useRef(false);
  const cardScrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation();
  const { handlePress: handleFilterPress, isDebugMode } = useDebugAccess();

  // Track screen view
  useEffect(() => {
    trackScreenView('Discover');
  }, []);

  // Navigate to debug screen when activated
  useEffect(() => {
    if (isDebugMode && navigation) {
      (navigation as any).navigate('Debug');
    }
  }, [isDebugMode, navigation]);

  // Load matches on mount
  useEffect(() => {
    const userId = currentUser?.id ?? null;

    // Reset guard when user changes
    if (userId && lastLoadedUserIdRef.current !== userId) {
      lastLoadedUserIdRef.current = userId;
      didInitialLoadRef.current = false;
    }

    // Prevent infinite retry loops when backend returns [] (e.g. user not found)
    if (userId && !didInitialLoadRef.current && matches.length === 0 && !isLoading) {
      didInitialLoadRef.current = true;
      loadMatches(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, matches.length, isLoading]);

  const handleLike = (): void => {
    const currentMatch = getCurrentMatch();
    if (currentMatch) {
      const { user, similarityScore, sharedValuesCount } = currentMatch;
      trackMatchLiked(user.id, {
        similarityScore,
        sharedValuesCount,
      });
      void likeUser(user.id).catch((e) => {
        const msg = e instanceof Error ? e.message : 'Could not save like';
        Alert.alert('Something went wrong', msg);
      });
    }
  };

  const handlePass = (): void => {
    const currentMatch = getCurrentMatch();
    if (currentMatch) {
      const { user, similarityScore } = currentMatch;
      trackMatchPassed(user.id, {
        similarityScore,
      });
      void passUser(user.id).catch((e) => {
        const msg = e instanceof Error ? e.message : 'Could not save pass';
        Alert.alert('Something went wrong', msg);
      });
    }
  };

  const handleApplyFilters = (nextFilters: typeof filters): Promise<void> => {
    return setFilters(nextFilters);
  };

  const handleResetFilters = async (): Promise<void> => {
    await setFilters({
      ageRange: DEFAULT_AGE_RANGE,
      radiusMiles: DEFAULT_RADIUS_MILES,
    });
  };

  const handleValuesHeaderPress = useCallback((): void => {
    navigateToValuesEditorFromProfile(navigation as NavigateToValuesEditorNav, currentUser ?? null);
  }, [navigation, currentUser]);

  const currentMatch = getCurrentMatch();
  const candidate = currentMatch?.user ?? null;

  const runDiscoverBlock = useCallback(async () => {
    const uid = currentUser?.id;
    const targetId = candidate?.id;
    if (!uid || !targetId) return;
    try {
      await insertUserBlock(uid, targetId);
      trackUserBlocked(targetId, { source: 'discover' });
      await loadMatches(uid, filters);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not block user';
      Alert.alert('Block failed', msg);
    }
  }, [currentUser?.id, candidate?.id, loadMatches, filters]);

  const openDiscoverSafetyMenu = useCallback(() => {
    if (!candidate?.id || !currentUser?.id) return;
    Alert.alert('Safety', undefined, [
      { text: 'Report', onPress: () => setReportVisible(true) },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Block this person?',
            'You won’t see them in Discover or Matches.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Block', style: 'destructive', onPress: () => void runDiscoverBlock() },
            ]
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [candidate?.id, currentUser?.id, runDiscoverBlock]);

  const handleDiscoverReportSubmit = useCallback(
    async (reason: ReportReason, details: string) => {
      const uid = currentUser?.id;
      const targetId = candidate?.id;
      if (!uid || !targetId) return;
      await insertUserReport({
        reporterId: uid,
        reportedUserId: targetId,
        reason,
        details,
        matchId: null,
      });
      trackUserReported(targetId, { reason, source: 'discover' });
    },
    [currentUser?.id, candidate?.id]
  );

  // Shared values from match (backend uses tiered top5/top10/top20/initial)
  const sharedValueIds = useMemo<Set<string>>(() => {
    return new Set(currentMatch?.sharedValues ?? []);
  }, [currentMatch?.sharedValues]);

  // Scroll reset after Like/Pass: next candidate and show profile from top (photo carousel)
  useEffect(() => {
    requestAnimationFrame(() => {
      cardScrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }, [candidate?.id]);

  // Loading state
  if (isLoading) {
    return <LoadingSpinner message="Finding matches..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        message={error}
        actionLabel="Try Again"
        onAction={() => currentUser && loadMatches(currentUser.id, filters)}
      />
    );
  }

  const isDiscoverPoolEmpty = matches.length === 0 && rankedDiscoverPoolLength === 0;
  const isQueueExhausted = !isDiscoverPoolEmpty && (!currentMatch || !candidate);
  const showDiscoverCard = !isDiscoverPoolEmpty && !isQueueExhausted;

  const discoverFeedbackContext = isDiscoverPoolEmpty
    ? 'discover_no_matches'
    : isQueueExhausted
      ? 'discover_all_caught_up'
      : 'discover_empty';

  return (
    <ScreenContainer
      contentPadding={false}
      headerBackgroundColor={theme.colors.headerBackground}
      safeAreaEdges={[]}
    >
      <View style={styles.container}>
        {/* Header: Filters (left) + Values (centered); shown for card and empty states */}
        <View style={[styles.headerBar, { paddingTop: insets.top + theme.spacing.sm, backgroundColor: theme.colors.headerBackground }]}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
            onLongPress={handleFilterPress}
          >
            <Text style={styles.filterButtonText}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerTitleButton}
            onPress={handleValuesHeaderPress}
            activeOpacity={0.7}
            accessibilityLabel="Edit your values"
            accessibilityRole="button"
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              Values
            </Text>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {discoverSwipeMode === 'supabase' && candidate ? (
              <TouchableOpacity
                style={styles.headerSafety}
                onPress={openDiscoverSafetyMenu}
                accessibilityLabel="Safety and report"
                accessibilityRole="button"
              >
                <Text style={styles.headerSafetyText}>Safety</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => (navigation as any).navigate('QRScanner')}
              accessibilityLabel="Check in to a venue"
              accessibilityRole="button"
            >
              <Ionicons name="qr-code-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/*{__DEV__ && (
          <View style={styles.devPanel}>
            <Text style={styles.devPanelTitle}>Discover (dev)</Text>
            <Text style={styles.devPanelText}>Candidates: {availableMatches.length}</Text>
            <Text style={styles.devPanelText}>
              Age: {filters?.ageRange?.[0] ?? 18}–{filters?.ageRange?.[1] ?? 99}
            </Text>
            <Text style={styles.devPanelText}>
              Radius: {typeof filters?.radiusMiles === 'number' ? filters.radiusMiles : 50} mi
            </Text>
          </View>
        )}*/}

        {isDiscoverPoolEmpty && (
          <View style={styles.emptyStateFill}>
            <EmptyState
              fullScreen={false}
              icon="🔍"
              title="No profiles yet"
              message="There's nobody new to show right now. Check back soon—or widen your filters and try again."
              actionLabel="Adjust Filters"
              onAction={() => setShowFilters(true)}
              secondaryActionLabel="Feedback"
              onSecondaryAction={() => setShowFeedbackModal(true)}
              containerStyle={styles.emptyStateInner}
            />
          </View>
        )}

        {isQueueExhausted && (
          <View style={styles.emptyStateFill}>
            <EmptyState
              fullScreen={false}
              icon="💫"
              title="You're All Caught Up"
              message="There are currently no more matches to show. Adjust your filters or check back later—or send us feedback."
              actionLabel="Refresh Matches"
              onAction={() => {
                if (currentUser) {
                  loadMatches(currentUser.id, filters);
                }
              }}
              secondaryActionLabel="Feedback"
              onSecondaryAction={() => setShowFeedbackModal(true)}
              containerStyle={styles.emptyStateInner}
            />
          </View>
        )}

        {showDiscoverCard && candidate && currentMatch && (
          <>
            {discoverMode === 'city' && (
              <View style={styles.cityBanner}>
                <Text style={styles.cityBannerText}>
                  Showing city-wide profiles — check in somewhere to see who's nearby
                </Text>
              </View>
            )}
            <View style={styles.cardArea}>
              <DiscoverSwipeCard
                onLike={handleLike}
                onPass={handlePass}
                disabled={false}
                cardKey={candidate.id}
              >
                <ProfileCard
                  ref={cardScrollRef}
                  user={candidate}
                  sharedValueIds={sharedValueIds}
                  similarityScore={typeof currentMatch.similarityScore === 'number' ? currentMatch.similarityScore : 0}
                  sharedValuesCount={typeof currentMatch.sharedValuesCount === 'number' ? currentMatch.sharedValuesCount : 0}
                  explanationLines={
                    currentMatch.valuesExplanation
                      ? formatExplanationLines(currentMatch.valuesExplanation)
                      : undefined
                  }
                  distanceMiles={currentMatch.distanceMiles}
                  sharedVenueName={currentMatch.sharedVenueName}
                  scrollViewProps={{
                    contentContainerStyle: { paddingBottom: theme.spacing['2xl'] },
                  }}
                />
              </DiscoverSwipeCard>
            </View>

            <View style={styles.fixedBottomBar}>
              <DiscoverActionBar
                onPass={handlePass}
                onLike={handleLike}
                disabled={!candidate}
              />
            </View>
          </>
        )}
      </View>

      <FiltersSheet
        visible={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        context={discoverFeedbackContext}
      />
      <ReportUserModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={handleDiscoverReportSubmit}
        reportedDisplayName={candidate?.name}
      />
    </ScreenContainer>
  );
};

export default DiscoverScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyStateFill: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
    backgroundColor: theme.colors.background,
  },
  emptyStateInner: {
    paddingTop: theme.spacing.md,
  },
  headerBar: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.headerBorder,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.headerBorder,
  },
  filterButtonText: {
    color: theme.colors.headerTint,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  headerTitleButton: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.headerTint,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 72,
    gap: theme.spacing.xs,
  },
  qrButton: {
    padding: theme.spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSafety: {
    minWidth: 72,
    alignItems: 'flex-end',
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
  },
  headerSafetyText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  cityBanner: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primaryLight + '18',
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  cityBannerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  cardArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    minHeight: 0,
    backgroundColor: theme.colors.background,
  },
  fixedBottomBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  subtleMeta: {
    paddingBottom: theme.spacing.xs,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  devPanel: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  devPanelTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  devPanelText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
});
