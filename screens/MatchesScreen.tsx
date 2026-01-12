import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useMatchesStore } from '../store/matchesStore';
import { useUserStore } from '../store/userStore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { trackScreenView } from '../services/analytics';
import { ScreenContainer } from '../components/ScreenContainer';
import { getAllValues } from '../services/mockBackend';
import { Value } from '../types/value';
import { Match } from '../types/match';
import { theme } from '../theme';

export const MatchesScreen: React.FC = () => {
  const { currentUser } = useUserStore();
  const { getLikedMatches, isLoading, likedUserIds } = useMatchesStore();
  const [availableValues, setAvailableValues] = useState<Value[]>([]);
  const [likedMatches, setLikedMatches] = useState<Match[]>([]);

  useEffect(() => {
    trackScreenView('Matches');
  }, []);

  useEffect(() => {
    getAllValues().then(setAvailableValues);
  }, []);

  useEffect(() => {
    const matches = getLikedMatches();
    setLikedMatches(matches);
  }, [likedUserIds, getLikedMatches]);

  // Get value name by ID
  const getValueName = (valueId: string): string => {
    const value = availableValues.find((v) => v.id === valueId);
    return value?.name || valueId;
  };

  // Render a match card with defensive checks
  const renderMatchCard = ({ item: match }: { item: Match }): React.ReactElement | null => {
    // Defensive check: ensure match exists
    if (!match || !match.user) {
      return null;
    }

    const { user, similarityScore, sharedValues, sharedValuesCount } = match;

    // Defensive check: ensure user has required fields
    if (!user.id || !user.name) {
      return null;
    }

    // Safely get top 5 values with type guards
    const top5Values: Value[] = [];
    if (user.selectedValues && Array.isArray(user.selectedValues)) {
      const top5Ids = user.selectedValues.slice(0, 5);
      for (const id of top5Ids) {
        if (id) {
          const value = availableValues.find((v) => v && v.id === id);
          if (value) {
            top5Values.push(value);
          }
        }
      }
    }

    return (
      <View style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View>
            <Text style={styles.matchName}>{user.name}</Text>
            <Text style={styles.matchAge}>
              {user.age || '?'} • {user.location || 'Location not set'}
            </Text>
          </View>
          <View style={styles.matchScoreContainer}>
            <Text style={styles.matchScore}>
              {typeof similarityScore === 'number' ? similarityScore : 0}%
            </Text>
            <Text style={styles.matchScoreLabel}>Match</Text>
          </View>
        </View>

        {user.bio && (
          <Text style={styles.matchBio} numberOfLines={2}>
            {user.bio}
          </Text>
        )}

        {sharedValues && Array.isArray(sharedValues) && sharedValues.length > 0 && (
          <View style={styles.sharedValuesSection}>
            <Text style={styles.sharedValuesTitle}>
              {sharedValuesCount || 0} Shared Value{(sharedValuesCount || 0) !== 1 ? 's' : ''}
            </Text>
            <View style={styles.sharedValuesChips}>
              {sharedValues.slice(0, 5).map((valueId) => {
                if (!valueId) return null;
                return (
                  <View key={valueId} style={styles.sharedValueChip}>
                    <Text style={styles.sharedValueChipText}>{getValueName(valueId)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {top5Values.length > 0 && (
          <View style={styles.topValuesSection}>
            <Text style={styles.topValuesTitle}>Their Top 5 Values</Text>
            <View style={styles.topValuesChips}>
              {top5Values.map((value) => {
                if (!value || !value.id) return null;
                return (
                  <View key={value.id} style={styles.topValueChip}>
                    <Text style={styles.topValueChipText}>{value.name || 'Unknown'}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {user.prompts && Array.isArray(user.prompts) && user.prompts.length > 0 && (
          <View style={styles.promptsSection}>
            {user.prompts.slice(0, 2).map((prompt) => {
              if (!prompt || !prompt.id) return null;
              return (
                <View key={prompt.id} style={styles.promptItem}>
                  <Text style={styles.promptQuestion}>
                    {prompt.question || 'Question'}
                  </Text>
                  <Text style={styles.promptAnswer} numberOfLines={1}>
                    {prompt.answer || 'No answer provided'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading matches..." />;
  }

  if (likedMatches.length === 0) {
    return (
      <EmptyState
        icon="💕"
        title="No Matches Yet"
        message="Start swiping in Discover to find people you like. Your matches will appear here!"
        actionLabel="Go to Discover"
        onAction={() => {
          // Navigation would be handled by tab navigator
          // This is just a placeholder for the action
        }}
      />
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Matches</Text>
        <Text style={styles.headerSubtitle}>
          {likedMatches.length} match{likedMatches.length !== 1 ? 'es' : ''}
        </Text>
      </View>
      <FlatList
        data={likedMatches}
        renderItem={renderMatchCard}
        keyExtractor={(item) => item.user.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing['4xl'],
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  listContent: {
    padding: theme.spacing.base,
  },
  matchCard: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  matchName: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  matchAge: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  matchScoreContainer: {
    alignItems: 'flex-end',
  },
  matchScore: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  matchScoreLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  matchBio: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
    marginBottom: theme.spacing.base,
  },
  sharedValuesSection: {
    marginBottom: theme.spacing.base,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sharedValuesTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  sharedValuesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sharedValueChip: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.xs + 2,
    marginBottom: theme.spacing.xs + 2,
  },
  sharedValueChipText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textInverse,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  topValuesSection: {
    marginBottom: theme.spacing.base,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  topValuesTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  topValuesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topValueChip: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.xs + 2,
    marginBottom: theme.spacing.xs + 2,
  },
  topValueChipText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  promptsSection: {
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  promptItem: {
    marginBottom: theme.spacing.md,
  },
  promptQuestion: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  promptAnswer: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.normal,
  },
});
