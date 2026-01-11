import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useMatchesStore } from '../store/matchesStore';
import { useUserStore } from '../store/userStore';
import { PrimaryButton } from '../components/PrimaryButton';
import { getAllValues } from '../services/mockBackend';
import { Value } from '../types/value';

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
      likeUser(currentMatch.user.id);
    }
  };

  const handlePass = (): void => {
    if (currentMatch) {
      passUser(currentMatch.user.id);
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

  // Get top 5 values for display
  const getTop5Values = (valueIds: string[]): Value[] => {
    const top5Ids = valueIds.slice(0, 5);
    return availableValues.filter((v) => top5Ids.includes(v.id));
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Finding matches...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        {currentUser && (
          <PrimaryButton title="Retry" onPress={() => loadMatches(currentUser.id)} />
        )}
      </View>
    );
  }

  if (!currentMatch) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No More Matches</Text>
        <Text style={styles.subtitle}>
          You've seen all available matches. Check back later for more!
        </Text>
        {currentUser && (
          <PrimaryButton
            title="Reset & Reload"
            onPress={() => {
              const { reset } = useMatchesStore.getState();
              reset();
              loadMatches(currentUser.id);
            }}
            style={{ marginTop: 20 }}
          />
        )}
      </View>
    );
  }

  const { user, similarityScore, sharedValues, sharedValuesCount } = currentMatch;
  const top5Values = getTop5Values(user.selectedValues);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Filter Button */}
      <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
        <Text style={styles.filterButtonText}>Filters</Text>
      </TouchableOpacity>

      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.age}>{user.age} • {user.location}</Text>
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
            <Text style={styles.similarityScore}>{similarityScore}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${similarityScore}%` }]} />
          </View>
          <Text style={styles.sharedValuesText}>
            {sharedValuesCount} shared value{sharedValuesCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Top 5 Values */}
        <View style={styles.valuesContainer}>
          <Text style={styles.valuesTitle}>Their Top 5 Values</Text>
          <View style={styles.valuesChipsContainer}>
            {top5Values.map((value) => (
              <View key={value.id} style={styles.valueChip}>
                <Text style={styles.valueChipText}>{value.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Prompts */}
        {user.prompts.length > 0 && (
          <View style={styles.promptsContainer}>
            <Text style={styles.promptsTitle}>Prompts</Text>
            {user.prompts.map((prompt) => (
              <View key={prompt.id} style={styles.promptItem}>
                <Text style={styles.promptQuestion}>{prompt.question}</Text>
                <Text style={styles.promptAnswer}>{prompt.answer}</Text>
              </View>
            ))}
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
        {currentMatchIndex + 1} of {availableMatches.length}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  filterButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginBottom: 16,
  },
  filterButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    marginBottom: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  age: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  job: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  bioContainer: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bio: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  similarityContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  similarityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  similarityLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  similarityScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  sharedValuesText: {
    fontSize: 12,
    color: '#666',
  },
  valuesContainer: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  valuesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  valuesChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  valueChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  valueChipText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  promptsContainer: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  promptsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  passButton: {
    backgroundColor: '#ccc',
  },
  likeButton: {
    backgroundColor: '#007AFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    padding: 20,
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
  },
  matchCounter: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  ageInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  ageInput: {
    flex: 1,
  },
  ageInputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
  },
  modalCancel: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
