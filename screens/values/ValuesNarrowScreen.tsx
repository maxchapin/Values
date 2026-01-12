import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useValuesSelectionStore } from '../../store/valuesSelectionStore';
import { ValueCard } from '../../components/ValueCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { trackScreenView, trackValueSelection } from '../../services/analytics';
import { ScreenContainer } from '../../components/ScreenContainer';
import { theme } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { ValuesSelectionStep } from '../../types/value';

type ValuesNarrowScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ValuesNarrow20' | 'ValuesNarrow10'
>;

export const ValuesNarrowScreen: React.FC<ValuesNarrowScreenProps> = ({ route, navigation }) => {
  const {
    selectedAny,
    top20,
    availableValues,
    currentStep: storeStep,
    canProceedToNextStep,
    proceedToNextStep,
    addValue,
    removeValue,
    getRequiredCountForStep,
    goToPreviousStep,
    getCurrentSelections,
    setCurrentStep,
    validateState,
  } = useValuesSelectionStore();

  // Determine expected step from route name
  const getExpectedStep = (): ValuesSelectionStep => {
    if (route.name === 'ValuesNarrow20') return ValuesSelectionStep.NARROW_20;
    if (route.name === 'ValuesNarrow10') return ValuesSelectionStep.NARROW_10;
    return ValuesSelectionStep.NARROW_20;
  };

  const expectedStep = getExpectedStep();
  
  // Track screen view
  useEffect(() => {
    const screenName = expectedStep === ValuesSelectionStep.NARROW_20
      ? 'ValuesNarrow20'
      : 'ValuesNarrow10';
    trackScreenView(screenName);
  }, [expectedStep]);

  // Sync store step with route when screen comes into focus (handles back navigation)
  useFocusEffect(
    useCallback(() => {
      if (storeStep !== expectedStep) {
        if (__DEV__) {
          console.log(`[ValuesNarrowScreen] Syncing step: ${storeStep} → ${expectedStep} (route: ${route.name})`);
        }
        setCurrentStep(expectedStep);
      }

      // Validate state in dev mode
      if (__DEV__) {
        const validation = validateState();
        if (!validation.isValid) {
          console.warn(`[ValuesNarrowScreen] State validation failed at step ${expectedStep}:`, validation.errors);
        }
        const currentSelections = getCurrentSelections();
        console.log(`[ValuesNarrowScreen] Screen focused (${route.name}), selections: ${currentSelections.length}`);
      }
    }, [route.name, expectedStep, storeStep, setCurrentStep, validateState, getCurrentSelections])
  );

  // Use store's current step as source of truth
  const currentStep = storeStep;
  const requiredCount = getRequiredCountForStep(currentStep);
  const currentSelections = getCurrentSelections();
  const currentCount = currentSelections.length;
  const remaining = requiredCount ? requiredCount - currentCount : 0;

  // Track screen view
  useEffect(() => {
    const screenName = currentStep === ValuesSelectionStep.NARROW_20
      ? 'ValuesNarrow20'
      : 'ValuesNarrow10';
    trackScreenView(screenName);
  }, [currentStep]);

  // Track value selection changes
  useEffect(() => {
    if (currentCount > 0 && (currentStep === ValuesSelectionStep.NARROW_20 || currentStep === ValuesSelectionStep.NARROW_10)) {
      const stepName = currentStep === ValuesSelectionStep.NARROW_20
        ? 'narrow_20'
        : 'narrow_10';
      trackValueSelection(stepName, currentCount);
    }
  }, [currentCount, currentStep]);

  // For narrowing, show only values from previous step
  const valuesToShow = currentStep === ValuesSelectionStep.NARROW_20
    ? availableValues.filter((v) => selectedAny.includes(v.id))
    : availableValues.filter((v) => top20.includes(v.id));

  const handleValuePress = (valueId: string): void => {
    // Defensive check: ensure we're on the right step
    if (currentStep !== expectedStep) {
      if (__DEV__) {
        console.warn(`[ValuesNarrowScreen] Step mismatch: currentStep=${currentStep}, expectedStep=${expectedStep}`);
      }
      // Sync step if mismatch
      setCurrentStep(expectedStep);
      return;
    }

    // Use currentSelections as source of truth
    if (currentSelections.includes(valueId)) {
      removeValue(valueId);
    } else {
      // Can add if we haven't reached the required count
      if (requiredCount === null || currentCount < requiredCount) {
        addValue(valueId);
      } else {
        if (__DEV__) {
          console.log(`[ValuesNarrowScreen] Cannot add ${valueId}: already at max (${requiredCount})`);
        }
      }
    }
  };

  const handleContinue = (): void => {
    if (!canProceedToNextStep()) {
      return;
    }

    proceedToNextStep();

    // Navigate to next screen
    if (currentStep === ValuesSelectionStep.NARROW_20) {
      navigation.navigate('ValuesNarrow10');
    } else if (currentStep === ValuesSelectionStep.NARROW_10) {
      navigation.navigate('ValuesFinal5');
    }
  };

  const handleBack = (): void => {
    goToPreviousStep();
    navigation.goBack();
  };

  const getStepTitle = (): string => {
    switch (currentStep) {
      case ValuesSelectionStep.NARROW_20:
        return 'Narrow to Top 20';
      case ValuesSelectionStep.NARROW_10:
        return 'Narrow to Top 10';
      default:
        return 'Narrow Your Values';
    }
  };

  const getStepDescription = (): string => {
    if (requiredCount) {
      return `Select exactly ${requiredCount} values. ${remaining > 0 ? `${remaining} more needed.` : 'Perfect!'}`;
    }
    return 'Select your values.';
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>{getStepTitle()}</Text>
        <Text style={styles.subtitle}>{getStepDescription()}</Text>
        <View style={styles.countContainer}>
          <Text style={[styles.count, currentCount === requiredCount && styles.countExact]}>
            {currentCount} / {requiredCount}
          </Text>
          {currentCount !== requiredCount && (
            <Text style={styles.remaining}>
              {remaining > 0 ? `${remaining} more needed` : 'Too many selected'}
            </Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {valuesToShow.map((value) => (
          <ValueCard
            key={value.id}
            value={value}
            isSelected={currentSelections.includes(value.id)}
            onPress={() => handleValuePress(value.id)}
            disabled={!currentSelections.includes(value.id) && currentCount >= (requiredCount || 0)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <SecondaryButton
            title="Back"
            onPress={handleBack}
            style={styles.backButton}
          />
          <PrimaryButton
            title="Continue"
            onPress={handleContinue}
            disabled={!canProceedToNextStep()}
            style={styles.continueButton}
          />
        </View>
        {!canProceedToNextStep() && requiredCount && (
          <Text style={styles.hint}>
            {currentCount < requiredCount
              ? `Select exactly ${requiredCount} values to continue`
              : `You must select exactly ${requiredCount} values`}
          </Text>
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
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  countExact: {
    color: theme.colors.success,
  },
  remaining: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.medium,
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
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
  hint: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    textAlign: 'center',
  },
});
