import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { FiltersSheet } from '../components/FiltersSheet';
import { getAllValues } from '../services/mockBackend';
import { Value } from '../types/value';
import { theme } from '../theme';

export const DiscoverScreen: React.FC = () => {
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

  const [showFilters, setShowFilters] = useState(false);
  const [availableValues, setAvailableValues] = useState<Value[]>([]);
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
    if (userId && !didInitialLoadRef.current && availableMatches.length === 0 && !isLoading) {
      didInitialLoadRef.current = true;
      loadMatches(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, availableMatches.length, isLoading]);

  // Load values for display
  useEffect(() => {
    getAllValues().then(setAvailableValues);
  }, []);

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
      radiusKm: 200,
    });
  };

  // Get top 5 values for display with defensive checks
  const getTop5Values = (valueIds: string[] | undefined): Value[] => {
    if (!valueIds || !Array.isArray(valueIds) || valueIds.length === 0) {
      return [];
    }
    const top5Ids = valueIds.slice(0, 5);
    return availableValues.filter((v) => v && v.id && top5Ids.includes(v.id));
  };

  const currentMatch = getCurrentMatch();
  const candidate = currentMatch?.user ?? null;

  const currentUserTopValues = useMemo<Value[]>(() => {
    return getTop5Values(currentUser?.selectedValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.selectedValues, availableValues.length]);

  const candidateTopValues = useMemo<Value[]>(() => {
    return candidate ? getTop5Values(candidate.selectedValues) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.selectedValues, availableValues.length]);

  const sharedValueIds = useMemo<Set<string>>(() => {
    const a = new Set((currentUser?.selectedValues ?? []).slice(0, 5));
    const b = new Set((candidate?.selectedValues ?? []).slice(0, 5));
    const shared = new Set<string>();
    a.forEach((id) => {
      if (b.has(id)) shared.add(id);
    });
    return shared;
  }, [currentUser?.selectedValues, candidate?.selectedValues]);

  // Reset scroll position whenever we advance to a new candidate
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
  if (availableMatches.length === 0) {
    return (
      <EmptyState
        icon="🔍"
        title="No Matches Found"
        message="We couldn't find any matches with your current filters. Try adjusting your age range or location preferences."
        actionLabel="Adjust Filters"
        onAction={() => setShowFilters(true)}
      />
    );
  }

  // Reached end of queue (seen all matches)
  if (!currentMatch || !candidate) {
    return (
      <EmptyState
        icon="💫"
        title="You're All Caught Up"
        message="You've seen all available matches. Try adjusting your filters or check back later for more!"
        actionLabel="Refresh Matches"
        onAction={() => {
          if (currentUser) {
            reset();
            loadMatches(currentUser.id, filters);
          }
        }}
      />
    );
  }

  const { similarityScore, sharedValuesCount } = currentMatch;

  return (
    <ScreenContainer contentPadding={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
            onLongPress={handleFilterPress}
          >
            <Text style={styles.filterButtonText}>Filters</Text>
          </TouchableOpacity>
          <Text style={styles.counterText}>
            {Math.min(currentMatchIndex + 1, availableMatches.length)} / {availableMatches.length}
          </Text>
        </View>

        {/* Card + fixed action bar */}
        <View style={styles.cardArea}>
          <DiscoverProfileCard
            ref={cardScrollRef}
            candidate={candidate}
            currentUserTopValues={currentUserTopValues}
            candidateTopValues={candidateTopValues}
            sharedValueIds={sharedValueIds}
            scrollViewProps={{
              contentContainerStyle: { paddingBottom: theme.spacing['2xl'] },
            }}
          />
        </View>

        {/* Match score (optional, subtle) */}
        <Text style={styles.subtleMeta}>
          Match score: {typeof similarityScore === 'number' ? similarityScore : 0}% • {sharedValuesCount || 0} shared value{(sharedValuesCount || 0) !== 1 ? 's' : ''}
        </Text>

        <DiscoverActionBar
          onPass={handlePass}
          onLike={handleLike}
          disabled={!candidate}
        />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  counterText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  cardArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.base,
  },
  subtleMeta: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  // Filters styles moved into `FiltersSheet`
});
