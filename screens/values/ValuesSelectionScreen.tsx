import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useValuesSelectionStore } from '../../store/valuesSelectionStore';
import { ValueCard } from '../../components/ValueCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { trackScreenView, trackValueSelection } from '../../services/analytics';
import { ScreenContainer } from '../../components/ScreenContainer';
import { theme } from '../../theme';
import { RootStackParamList } from '../../navigation/types';

type ValuesSelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'ValuesSelection'>;

export const ValuesSelectionScreen: React.FC<ValuesSelectionScreenProps> = ({ navigation }) => {
  const {
    availableValues,
    selectedAny,
    isLoading,
    error,
    loadValues,
    addValue,
    removeValue,
    canProceedToNextStep,
    proceedToNextStep,
  } = useValuesSelectionStore();

  // Track screen view
  useEffect(() => {
    trackScreenView('ValuesSelection');
  }, []);

  // Load values on mount
  useEffect(() => {
    if (availableValues.length === 0) {
      loadValues();
    }
  }, [availableValues.length, loadValues]);

  // Track value selection changes
  useEffect(() => {
    if (selectedAny.length > 0) {
      trackValueSelection('initial', selectedAny.length);
    }
  }, [selectedAny.length]);

  const handleValuePress = (valueId: string): void => {
    if (selectedAny.includes(valueId)) {
      removeValue(valueId);
    } else {
      addValue(valueId);
    }
  };

  const handleContinue = (): void => {
    if (canProceedToNextStep()) {
      proceedToNextStep();
      navigation.navigate('ValuesNarrow20');
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading values..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Something went wrong"
        message={error}
      />
    );
  }

  if (availableValues.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="No Values Available"
        message="There are no values to select at the moment. Please try again later."
      />
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Values</Text>
        <Text style={styles.subtitle}>
          Choose any values that matter to you. You'll narrow them down in the next steps.
        </Text>
        <Text style={styles.count}>
          Selected: {selectedAny.length}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {availableValues.map((value) => (
          <ValueCard
            key={value.id}
            value={value}
            isSelected={selectedAny.includes(value.id)}
            onPress={() => handleValuePress(value.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          disabled={!canProceedToNextStep()}
        />
        {selectedAny.length === 0 && (
          <Text style={styles.hint}>Select at least one value to continue</Text>
        )}
      </View>
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
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  count: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  hint: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});
