import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { useMatchesStore } from '../store/matchesStore';
import { useUserStore } from '../store/userStore';
import { getAllValues } from '../services/mockBackend';
import { Value } from '../types/value';
import { Match } from '../types/match';

export const MatchesScreen: React.FC = () => {
  const { currentUser } = useUserStore();
  const { getLikedMatches, isLoading, likedUserIds } = useMatchesStore();
  const [availableValues, setAvailableValues] = useState<Value[]>([]);
  const [likedMatches, setLikedMatches] = useState<Match[]>([]);

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

  // Render a match card
  const renderMatchCard = ({ item: match }: { item: Match }): React.ReactElement => {
    const { user, similarityScore, sharedValues, sharedValuesCount } = match;
    const top5Values = user.selectedValues.slice(0, 5).map((id) => availableValues.find((v) => v.id === id)).filter((v): v is Value => v !== undefined);


    return (
      <View style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View>
            <Text style={styles.matchName}>{user.name}</Text>
            <Text style={styles.matchAge}>{user.age} • {user.location}</Text>
          </View>
          <View style={styles.matchScoreContainer}>
            <Text style={styles.matchScore}>{similarityScore}%</Text>
            <Text style={styles.matchScoreLabel}>Match</Text>
          </View>
        </View>

        {user.bio && (
          <Text style={styles.matchBio} numberOfLines={2}>
            {user.bio}
          </Text>
        )}

        <View style={styles.sharedValuesSection}>
          <Text style={styles.sharedValuesTitle}>
            {sharedValuesCount} Shared Value{sharedValuesCount !== 1 ? 's' : ''}
          </Text>
          <View style={styles.sharedValuesChips}>
            {sharedValues.slice(0, 5).map((valueId) => (
              <View key={valueId} style={styles.sharedValueChip}>
                <Text style={styles.sharedValueChipText}>{getValueName(valueId)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.topValuesSection}>
          <Text style={styles.topValuesTitle}>Their Top 5 Values</Text>
          <View style={styles.topValuesChips}>
            {top5Values.map((value) => (
              <View key={value.id} style={styles.topValueChip}>
                <Text style={styles.topValueChipText}>{value.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {user.prompts.length > 0 && (
          <View style={styles.promptsSection}>
            {user.prompts.slice(0, 2).map((prompt) => (
              <View key={prompt.id} style={styles.promptItem}>
                <Text style={styles.promptQuestion}>{prompt.question}</Text>
                <Text style={styles.promptAnswer} numberOfLines={1}>
                  {prompt.answer}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    );
  }

  if (likedMatches.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No Matches Yet</Text>
        <Text style={styles.subtitle}>
          Start swiping in Discover to find people you like. Your matches will appear here!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Matches</Text>
        <Text style={styles.headerSubtitle}>{likedMatches.length} match{likedMatches.length !== 1 ? 'es' : ''}</Text>
      </View>
      <FlatList
        data={likedMatches}
        renderItem={renderMatchCard}
        keyExtractor={(item) => item.user.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  matchCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  matchName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  matchAge: {
    fontSize: 14,
    color: '#666',
  },
  matchScoreContainer: {
    alignItems: 'flex-end',
  },
  matchScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  matchScoreLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  matchBio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  sharedValuesSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sharedValuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  sharedValuesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sharedValueChip: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  sharedValueChipText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  topValuesSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  topValuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  topValuesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topValueChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  topValueChipText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
  promptsSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  promptItem: {
    marginBottom: 12,
  },
  promptQuestion: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  promptAnswer: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
});
