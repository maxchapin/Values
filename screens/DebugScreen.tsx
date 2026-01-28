import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useUserStore } from '../store/userStore';
import { useValuesSelectionStore } from '../store/valuesSelectionStore';
import { useMatchesStore } from '../store/matchesStore';
import { ScreenContainer } from '../components/ScreenContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { theme } from '../theme';
import { getAllValues, getMockUsers } from '../services/mockBackend';
import { Value } from '../types/value';
import { Match } from '../types/match';

/**
 * Debug Screen
 * Only accessible in development mode
 * Shows user data, values selections, and candidate users
 */
export const DebugScreen: React.FC = () => {
  const { currentUser, logout, isAuthenticated, isProfileComplete, isValuesComplete } = useUserStore();
  const { selectedAny, top20, top10, top5, currentStep, reset: resetValues } = useValuesSelectionStore();
  const {
    availableMatches,
    currentMatchIndex,
    filters,
    reset: resetMatches,
    loadMatches,
    setFilters,
  } = useMatchesStore();
  
  const [availableValues, setAvailableValues] = useState<Value[]>([]);
  const [candidateUsers, setCandidateUsers] = useState<Match[]>([]);

  useEffect(() => {
    // Load values and candidate users
    getAllValues().then(setAvailableValues);
    if (currentUser && currentUser.selectedValues.length > 0) {
      getMockUsers().then((users) => {
        // Calculate similarity for each candidate using the same algorithm as mockBackend
        const matches: Match[] = users
          .filter((u) => u.id !== currentUser.id)
          .map((user) => {
            const sharedValues = currentUser.selectedValues.filter((v) =>
              user.selectedValues.includes(v)
            );
            
            if (sharedValues.length === 0) {
              return {
                user,
                similarityScore: 0,
                sharedValues: [],
                sharedValuesCount: 0,
              };
            }

            // Use similar weighted scoring as mockBackend
            const top5 = currentUser.selectedValues.slice(0, 5);
            const top10 = currentUser.selectedValues.slice(0, 10);
            const top20 = currentUser.selectedValues.slice(0, 20);

            const sharedTop5 = sharedValues.filter((v) => top5.includes(v)).length;
            const sharedTop10 = sharedValues.filter((v) => top10.includes(v)).length;
            const sharedTop20 = sharedValues.filter((v) => top20.includes(v)).length;

            let score = 0;
            score += sharedTop5 * 0.5;
            const sharedTop10Excluding5 = sharedTop10 - sharedTop5;
            score += sharedTop10Excluding5 * 0.2;
            const sharedTop20Excluding10 = sharedTop20 - sharedTop10;
            score += sharedTop20Excluding10 * 0.1;
            const remainingShared = sharedValues.length - sharedTop20;
            score += remainingShared * 0.05;

            const maxPossibleScore = 5 * 0.5 + 5 * 0.2 + 10 * 0.1 + 20 * 0.05;
            const normalizedScore = Math.min(score / maxPossibleScore, 1);
            const similarityScore = Math.round(normalizedScore * 100);

            return {
              user,
              similarityScore,
              sharedValues,
              sharedValuesCount: sharedValues.length,
            };
          })
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .slice(0, 5); // Show top 5 candidates
        setCandidateUsers(matches);
      });
    } else {
      setCandidateUsers([]);
    }
  }, [currentUser]);

  const getValueName = (valueId: string): string => {
    const value = availableValues.find((v) => v.id === valueId);
    return value?.name || valueId;
  };

  const handleResetOnboarding = (): void => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset your profile and values selections. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetValues();
            logout();
          },
        },
      ]
    );
  };

  const handleResetMockData = (): void => {
    Alert.alert(
      'Reset Mock Data',
      'This will reset matches and clear liked users. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetMatches();
            if (currentUser) {
              loadMatches(currentUser.id);
            }
            Alert.alert('Success', 'Mock data has been reset.');
          },
        },
      ]
    );
  };

  const handleClearMatches = (): void => {
    Alert.alert(
      'Clear Matches',
      'This will clear all available matches to simulate "no candidates" scenario. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            useMatchesStore.setState({
              availableMatches: [],
              currentMatchIndex: 0,
            });
            Alert.alert('Success', 'Matches cleared. Discover screen will show empty state.');
          },
        },
      ]
    );
  };

  const handleSetNoMatchFilters = async (): Promise<void> => {
    Alert.alert(
      'Set No-Match Filters',
      'This will set filters (age 1-2) that result in no matches. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set Filters',
          style: 'destructive',
          onPress: async () => {
            if (currentUser) {
              await setFilters({
                ageRange: [1, 2], // No users will match this
              });
              Alert.alert('Success', 'Filters set. Discover screen will show empty state.');
            }
          },
        },
      ]
    );
  };

  const handleSimulateEndOfQueue = (): void => {
    Alert.alert(
      'Simulate End of Queue',
      'This will set the match index to the end to simulate "all caught up" scenario.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate',
          onPress: () => {
            if (availableMatches.length > 0) {
              useMatchesStore.setState({
                currentMatchIndex: availableMatches.length,
              });
              Alert.alert('Success', 'Match index set to end. Discover screen will show "all caught up" state.');
            } else {
              Alert.alert('Info', 'No matches available. Clear matches first or load matches.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🔧 Debug Panel</Text>
          <Text style={styles.subtitle}>Development Mode Only</Text>
        </View>

        {/* User Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Profile</Text>
          {currentUser ? (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>ID:</Text>
                <Text style={styles.value}>{currentUser.id}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{currentUser.name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{currentUser.email}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Age:</Text>
                <Text style={styles.value}>{currentUser.age}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Gender:</Text>
                <Text style={styles.value}>{currentUser.gender}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Location:</Text>
                <Text style={styles.value}>{currentUser.locationLabel ?? 'Not set'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Bio:</Text>
                <Text style={styles.value} numberOfLines={2}>{currentUser.bio}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Prompts:</Text>
                <Text style={styles.value}>{currentUser.prompts.length}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>No user logged in</Text>
          )}
        </View>

        {/* Onboarding Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onboarding Status</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Authenticated:</Text>
              <Text style={[styles.value, isAuthenticated && styles.success]}>
                {isAuthenticated ? '✓' : '✗'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Profile Complete:</Text>
              <Text style={[styles.value, isProfileComplete && styles.success]}>
                {isProfileComplete ? '✓' : '✗'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Values Complete:</Text>
              <Text style={[styles.value, isValuesComplete && styles.success]}>
                {isValuesComplete ? '✓' : '✗'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Current Step:</Text>
              <Text style={styles.value}>{currentStep}</Text>
            </View>
          </View>
        </View>

        {/* Values Selections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Values Selections</Text>
          <View style={styles.card}>
            <View style={styles.valuesRow}>
              <Text style={styles.label}>Selected Any:</Text>
              <Text style={styles.value}>{selectedAny.length}</Text>
            </View>
            {selectedAny.length > 0 && (
              <View style={styles.valuesList}>
                {selectedAny.slice(0, 10).map((id) => (
                  <Text key={id} style={styles.valueItem}>
                    • {getValueName(id)}
                  </Text>
                ))}
                {selectedAny.length > 10 && (
                  <Text style={styles.moreText}>+ {selectedAny.length - 10} more</Text>
                )}
              </View>
            )}

            <View style={styles.valuesRow}>
              <Text style={styles.label}>Top 20:</Text>
              <Text style={styles.value}>{top20.length}</Text>
            </View>
            {top20.length > 0 && (
              <View style={styles.valuesList}>
                {top20.slice(0, 5).map((id) => (
                  <Text key={id} style={styles.valueItem}>
                    • {getValueName(id)}
                  </Text>
                ))}
                {top20.length > 5 && (
                  <Text style={styles.moreText}>+ {top20.length - 5} more</Text>
                )}
              </View>
            )}

            <View style={styles.valuesRow}>
              <Text style={styles.label}>Top 10:</Text>
              <Text style={styles.value}>{top10.length}</Text>
            </View>
            {top10.length > 0 && (
              <View style={styles.valuesList}>
                {top10.map((id) => (
                  <Text key={id} style={styles.valueItem}>
                    • {getValueName(id)}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.valuesRow}>
              <Text style={styles.label}>Top 5 (Final):</Text>
              <Text style={styles.value}>{top5.length}</Text>
            </View>
            {top5.length > 0 && (
              <View style={styles.valuesList}>
                {top5.map((id) => (
                  <Text key={id} style={styles.valueItem}>
                    • {getValueName(id)}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Candidate Users Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Candidate Users</Text>
          {candidateUsers.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}>Age</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}>Score</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}>Shared</Text>
              </View>
              {candidateUsers.map((match) => (
                <View key={match.user.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                    {match.user.name}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{match.user.age}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {match.similarityScore}%
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {match.sharedValuesCount}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No candidate users available</Text>
          )}
        </View>

        {/* Matches Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matches Info</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Available Matches:</Text>
              <Text style={styles.value}>{availableMatches.length}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Current Index:</Text>
              <Text style={styles.value}>{currentMatchIndex}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Filters:</Text>
              <Text style={styles.value}>
                {filters.ageRange
                  ? `Age: ${filters.ageRange[0]}-${filters.ageRange[1]}`
                  : 'None'}
                {typeof filters.radiusKm === 'number' ? `, Within ${filters.radiusKm} km` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Reset Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reset Actions</Text>
          <View style={styles.buttonsContainer}>
            <SecondaryButton
              title="Reset Onboarding"
              onPress={handleResetOnboarding}
              style={styles.resetButton}
            />
            <SecondaryButton
              title="Reset Mock Data"
              onPress={handleResetMockData}
              style={styles.resetButton}
            />
          </View>
        </View>

        {/* Dev Mode Test Hooks */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧪 Test Edge Cases</Text>
            <Text style={styles.devNote}>
              Use these to manually test edge case scenarios
            </Text>
            <View style={styles.buttonsContainer}>
              <SecondaryButton
                title="Clear Matches (No Candidates)"
                onPress={handleClearMatches}
                style={styles.testButton}
              />
              <SecondaryButton
                title="Set No-Match Filters"
                onPress={handleSetNoMatchFilters}
                style={styles.testButton}
              />
              <SecondaryButton
                title="Simulate End of Queue"
                onPress={handleSimulateEndOfQueue}
                style={styles.testButton}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing['4xl'],
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  value: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
  },
  success: {
    color: theme.colors.success,
  },
  valuesList: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  valueItem: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
  moreText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: theme.spacing.base,
  },
  table: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  tableHeaderCell: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  tableCell: {
    padding: theme.spacing.sm,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text,
  },
  buttonsContainer: {
    gap: theme.spacing.md,
  },
  resetButton: {
    width: '100%',
  },
  testButton: {
    width: '100%',
    backgroundColor: theme.colors.warning,
    borderColor: theme.colors.warning,
  },
  devNote: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
});
