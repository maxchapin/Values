import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useValuesSelectionStore } from '../../store/valuesSelectionStore';
import { TagPill } from '../../components/TagPill';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { trackScreenView, trackValueSelection } from '../../services/analytics';
import { ScreenContainer } from '../../components/ScreenContainer';
import { theme } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { ValuesSelectionStep } from '../../types/value';

type ValuesSelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'ValuesSelection'>;

export const ValuesSelectionScreen: React.FC<ValuesSelectionScreenProps> = ({ navigation }) => {
  const {
    availableValues,
    isLoading,
    error,
    loadValues,
    addValue,
    removeValue,
    canProceedToNextStep,
    proceedToNextStep,
    getCurrentSelections,
    setCurrentStep,
    validateState,
  } = useValuesSelectionStore();

  // Get current selections (source of truth)
  const currentSelections = getCurrentSelections();

  // Track screen view and sync step on mount
  useEffect(() => {
    trackScreenView('ValuesSelection');
  }, []);

  // Sync step when screen comes into focus (handles back navigation)
  useFocusEffect(
    useCallback(() => {
      // Ensure store step matches this screen
      setCurrentStep(ValuesSelectionStep.INITIAL);
      
      // Validate state in dev mode
      if (__DEV__) {
        const validation = validateState();
        if (!validation.isValid) {
          console.warn('[ValuesSelectionScreen] State validation failed:', validation.errors);
        }
        console.log('[ValuesSelectionScreen] Screen focused, current selections:', getCurrentSelections().length);
      }
    }, [setCurrentStep, validateState, getCurrentSelections])
  );

  // Load values on mount
  useEffect(() => {
    if (availableValues.length === 0) {
      loadValues();
    }
  }, [availableValues.length, loadValues]);

  // Track value selection changes
  useEffect(() => {
    if (currentSelections.length > 0) {
      trackValueSelection('initial', currentSelections.length);
    }
  }, [currentSelections.length]);

  const handleValuePress = (valueId: string): void => {
    // Use currentSelections as source of truth
    if (currentSelections.includes(valueId)) {
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
    <ScreenContainer contentPadding={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Values</Text>
        <Text style={styles.subtitle}>
          Choose any values that matter to you. You'll narrow them down in the next steps.
        </Text>
        <Text style={styles.count}>
          Selected: {currentSelections.length}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.chipsGrid}>
          {availableValues.map((value) => (
            <TagPill
              key={value.id}
              label={value.name}
              selected={currentSelections.includes(value.id)}
              onPress={() => handleValuePress(value.id)}
              size="md"
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          disabled={!canProceedToNextStep()}
        />
        {currentSelections.length === 0 && (
          <Text style={styles.hint}>Select at least one value to continue</Text>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
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
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
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
