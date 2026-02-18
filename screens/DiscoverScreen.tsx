import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatchesStore } from '../store/matchesStore';
import { useUserStore } from '../store/userStore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useDebugAccess } from '../hooks/useDebugAccess';
import { trackScreenView, trackMatchLiked, trackMatchPassed } from '../services/analytics';
import { ScreenContainer } from '../components/ScreenContainer';
import { DiscoverActionBar } from '../components/DiscoverActionBar';
import { DiscoverProfileCard } from '../components/DiscoverProfileCard';
import { DiscoverSwipeCard } from '../components/DiscoverSwipeCard';
import { FiltersSheet } from '../components/FiltersSheet';
import { FeedbackModal } from '../components/FeedbackModal';
import { formatExplanationLines } from '../services/matchingModel';
import { theme } from '../theme';

export const DiscoverScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentUser } = useUserStore();
  const {
    availableMatches,
    currentMatchIndex,
    isLoading,
    error,
    filters,
    loadMatches,
    getCurrentMatch,
    likeUser,
    passUser,
    setFilters,
    reset,
  } = useMatchesStore();

  // Guard: store may not have availableMatches on first paint when switching tabs
  const matches = availableMatches ?? [];

  const [showFilters, setShowFilters] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
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
      likeUser(user.id);
    }
  };

  const handlePass = (): void => {
    const currentMatch = getCurrentMatch();
    if (currentMatch) {
      const { user, similarityScore } = currentMatch;
      trackMatchPassed(user.id, {
        similarityScore,
      });
      passUser(user.id);
    }
  };

  const handleApplyFilters = async (nextFilters: typeof filters): Promise<void> => {
    await setFilters(nextFilters);
  };

  const handleResetFilters = async (): Promise<void> => {
    await setFilters({
      ageRange: [18, 99],
      radiusMiles: 50,
    });
  };

  const currentMatch = getCurrentMatch();
  const candidate = currentMatch?.user ?? null;

  // Shared values from match (backend uses tiered top5/top10/top20/initial)
  const sharedValueIds = useMemo<Set<string>>(() => {
    return new Set(currentMatch?.sharedValues ?? []);
  }, [currentMatch?.sharedValues]);

  // Scroll reset after Like/Pass: advance to next candidate and show profile from top (photo carousel)
  useEffect(() => {
    requestAnimationFrame(() => {
      cardScrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }, [currentMatchIndex]);

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

  // No matches initially (empty list from backend)
  if (matches.length === 0) {
    return (
      <>
        <EmptyState
          icon="🔍"
          title="No Matches Found"
          message="There are currently no more matches available. Try adjusting your filters, or send us feedback so we can improve."
          actionLabel="Adjust Filters"
          onAction={() => setShowFilters(true)}
          secondaryActionLabel="Feedback"
          onSecondaryAction={() => setShowFeedbackModal(true)}
        />
        <FeedbackModal
          visible={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          context="discover_no_matches"
        />
      </>
    );
  }

  // Reached end of queue (seen all matches)
  if (!currentMatch || !candidate) {
    return (
      <>
        <EmptyState
          icon="💫"
          title="You're All Caught Up"
          message="There are currently no more matches to show. Adjust your filters or check back later—or send us feedback."
          actionLabel="Refresh Matches"
          onAction={() => {
            if (currentUser) {
              reset();
              loadMatches(currentUser.id, filters);
            }
          }}
          secondaryActionLabel="Feedback"
          onSecondaryAction={() => setShowFeedbackModal(true)}
        />
        <FeedbackModal
          visible={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          context="discover_all_caught_up"
        />
      </>
    );
  }

  return (
    <ScreenContainer contentPadding={false} headerBackgroundColor={theme.colors.headerBackground}>
      <View style={styles.container}>
        {/* Header: Filters (left) + Values (centered) */}
        <View style={[styles.headerBar, { paddingTop: insets.top + theme.spacing.sm, backgroundColor: theme.colors.headerBackground }]}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
            onLongPress={handleFilterPress}
          >
            <Text style={styles.filterButtonText}>Filters</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Values
          </Text>
          <View style={styles.headerSpacer} />
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

        {/* Scrollable card area: swipe wrapper so swipe right = like, swipe left = pass */}
        <View style={styles.cardArea}>
          <DiscoverSwipeCard
            onLike={handleLike}
            onPass={handlePass}
            disabled={!candidate}
            cardKey={candidate?.id}
          >
            <DiscoverProfileCard
              ref={cardScrollRef}
              candidate={candidate}
              sharedValueIds={sharedValueIds}
              similarityScore={typeof currentMatch?.similarityScore === 'number' ? currentMatch.similarityScore : 0}
              sharedValuesCount={typeof currentMatch?.sharedValuesCount === 'number' ? currentMatch.sharedValuesCount : 0}
              explanationLines={
                currentMatch?.valuesExplanation
                  ? formatExplanationLines(currentMatch.valuesExplanation)
                  : undefined
              }
              distanceMiles={currentMatch?.distanceMiles}
              scrollViewProps={{
                contentContainerStyle: { paddingBottom: theme.spacing['2xl'] },
              }}
            />
          </DiscoverSwipeCard>
        </View>

        {/* Fixed bottom bar: Like/Pass (match score is on the card) */}
        <View style={styles.fixedBottomBar}>
          <DiscoverActionBar
            onPass={handlePass}
            onLike={handleLike}
            disabled={!candidate}
          />
        </View>
      </View>
      

      <FiltersSheet
        visible={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </ScreenContainer>
  );
};

export default DiscoverScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.headerTint,
    textAlign: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  headerSpacer: {
    width: 72,
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
