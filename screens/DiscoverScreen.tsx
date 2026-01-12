import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMatchesStore } from '../store/matchesStore';
import { useUserStore } from '../store/userStore';
import { PrimaryButton } from '../components/PrimaryButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useDebugAccess } from '../hooks/useDebugAccess';
import { trackScreenView, trackMatchLiked, trackMatchPassed } from '../services/analytics';
import { ScreenContainer } from '../components/ScreenContainer';
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
  } = useMatchesStore();

  const [showFilters, setShowFilters] = useState(false);
  const [minAge, setMinAge] = useState(filters.ageRange?.[0]?.toString() || '18');
  const [maxAge, setMaxAge] = useState(filters.ageRange?.[1]?.toString() || '100');
  const [locationFilter, setLocationFilter] = useState(filters.location || '');
  const [availableValues, setAvailableValues] = useState<Value[]>([]);
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
    if (currentUser && availableMatches.length === 0 && !isLoading) {
      loadMatches(currentUser.id);
    }
  }, [currentUser, availableMatches.length, isLoading, loadMatches]);

  // Load values for display
  useEffect(() => {
    getAllValues().then(setAvailableValues);
  }, []);

  const currentMatch = getCurrentMatch();

  const handleLike = (): void => {
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
    if (currentMatch) {
      const { user, similarityScore } = currentMatch;
      trackMatchPassed(user.id, {
        similarityScore,
      });
      passUser(user.id);
    }
  };

  const handleApplyFilters = async (): Promise<void> => {
    const min = parseInt(minAge, 10);
    const max = parseInt(maxAge, 10);
    
    if (min && max && min <= max && currentUser) {
      await setFilters({
        ageRange: [min, max],
        location: locationFilter.trim() || undefined,
      });
      setShowFilters(false);
    }
  };

  const handleClearFilters = async (): Promise<void> => {
    setMinAge('18');
    setMaxAge('100');
    setLocationFilter('');
    if (currentUser) {
      await setFilters({});
      setShowFilters(false);
    }
  };

  // Get top 5 values for display with defensive checks
  const getTop5Values = (valueIds: string[] | undefined): Value[] => {
    if (!valueIds || !Array.isArray(valueIds) || valueIds.length === 0) {
      return [];
    }
    const top5Ids = valueIds.slice(0, 5);
    return availableValues.filter((v) => v && v.id && top5Ids.includes(v.id));
  };

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
  const currentMatch = getCurrentMatch();
  if (!currentMatch) {
    return (
      <EmptyState
        icon="💫"
        title="You're All Caught Up"
        message="You've seen all available matches. Try adjusting your filters or check back later for more!"
        actionLabel="Refresh Matches"
        onAction={() => {
          if (currentUser) {
            const { reset } = useMatchesStore.getState();
            reset();
            loadMatches(currentUser.id, filters);
          }
        }}
      />
    );
  }

  // Defensive checks for current match
  if (!currentMatch.user) {
    return (
      <EmptyState
        icon="⚠️"
        title="Invalid Match Data"
        message="There was an issue loading this match. Please try again."
        actionLabel="Reload"
        onAction={() => currentUser && loadMatches(currentUser.id, filters)}
      />
    );
  }

  const { user, similarityScore, sharedValues, sharedValuesCount } = currentMatch;
  const top5Values = getTop5Values(user.selectedValues);

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      {/* Filter Button */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(true)}
        onLongPress={handleFilterPress}
      >
        <Text style={styles.filterButtonText}>Filters</Text>
      </TouchableOpacity>

      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.name}>{user.name || 'Unknown'}</Text>
            <Text style={styles.age}>
              {user.age || '?'} • {user.location || 'Location not set'}
            </Text>
          </View>
          {user.job && (
            <Text style={styles.job}>{user.job}</Text>
          )}
        </View>

        {user.bio && (
          <View style={styles.bioContainer}>
            <Text style={styles.bio}>{user.bio}</Text>
          </View>
        )}

        {/* Similarity Score */}
        <View style={styles.similarityContainer}>
          <View style={styles.similarityHeader}>
            <Text style={styles.similarityLabel}>Match Score</Text>
            <Text style={styles.similarityScore}>
              {typeof similarityScore === 'number' ? similarityScore : 0}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${Math.min(Math.max(similarityScore || 0, 0), 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.sharedValuesText}>
            {sharedValuesCount || 0} shared value{(sharedValuesCount || 0) !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Top 5 Values */}
        {top5Values.length > 0 && (
          <View style={styles.valuesContainer}>
            <Text style={styles.valuesTitle}>Their Top 5 Values</Text>
            <View style={styles.valuesChipsContainer}>
              {top5Values.map((value) => {
                if (!value || !value.id) return null;
                return (
                  <View key={value.id} style={styles.valueChip}>
                    <Text style={styles.valueChipText}>{value.name || 'Unknown'}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Prompts */}
        {user.prompts && Array.isArray(user.prompts) && user.prompts.length > 0 && (
          <View style={styles.promptsContainer}>
            <Text style={styles.promptsTitle}>Prompts</Text>
            {user.prompts.map((prompt) => {
              if (!prompt || !prompt.id) return null;
              return (
                <View key={prompt.id} style={styles.promptItem}>
                  <Text style={styles.promptQuestion}>
                    {prompt.question || 'Question'}
                  </Text>
                  <Text style={styles.promptAnswer}>
                    {prompt.answer || 'No answer provided'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton
            title="Pass"
            onPress={handlePass}
            style={[styles.actionButton, styles.passButton]}
            textStyle={{ color: '#333' }}
          />
          <PrimaryButton
            title="Like"
            onPress={handleLike}
            style={[styles.actionButton, styles.likeButton]}
          />
        </View>
      </View>

      <Text style={styles.matchCounter}>
        {Math.min(currentMatchIndex + 1, availableMatches.length)} of {availableMatches.length}
      </Text>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filters</Text>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Age Range</Text>
              <View style={styles.ageInputs}>
                <View style={styles.ageInput}>
                  <Text style={styles.ageInputLabel}>Min</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="18"
                    value={minAge}
                    onChangeText={setMinAge}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.ageInput}>
                  <Text style={styles.ageInputLabel}>Max</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="100"
                    value={maxAge}
                    onChangeText={setMaxAge}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Location</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="City, State (optional)"
                value={locationFilter}
                onChangeText={setLocationFilter}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                title="Clear"
                onPress={handleClearFilters}
                style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                textStyle={{ color: '#333' }}
              />
              <PrimaryButton
                title="Apply"
                onPress={handleApplyFilters}
                style={styles.modalButton}
              />
            </View>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing['4xl'],
  },
  filterButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.base,
  },
  filterButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  card: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    marginBottom: 16,
  },
  name: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  age: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  job: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  bioContainer: {
    marginBottom: theme.spacing.lg,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bio: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  similarityContainer: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.base,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  similarityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  similarityLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  similarityScore: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  sharedValuesText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  valuesContainer: {
    marginBottom: theme.spacing.lg,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  valuesTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  valuesChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  valueChip: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  valueChipText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  promptsContainer: {
    marginBottom: theme.spacing.lg,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  promptsTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  promptItem: {
    marginBottom: 16,
  },
  promptQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  promptAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  passButton: {
    backgroundColor: theme.colors.disabled,
  },
  likeButton: {
    backgroundColor: theme.colors.primary,
  },
  matchCounter: {
    textAlign: 'center',
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xl,
    color: theme.colors.text,
  },
  filterGroup: {
    marginBottom: theme.spacing.xl,
  },
  filterLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  ageInputs: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  ageInput: {
    flex: 1,
  },
  ageInputLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    backgroundColor: theme.colors.backgroundTertiary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.base,
  },
  modalButton: {
    flex: 1,
  },
  modalCancel: {
    padding: theme.spacing.base,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalCancelText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
