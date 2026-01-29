/**
 * ValuesOnboardingScreen
 * Main multi-step values onboarding flow
 * Handles: broad → top20 → top10 → top5 → summary
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useValuesOnboardingStore } from '../../store/valuesOnboardingStore';
import { useUserStore } from '../../store/userStore';
import { ValuesCloud } from '../../components/ValuesCloud';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { theme } from '../../theme';
import { UserValuesProfile } from '../../types/user';

export const ValuesOnboardingScreen: React.FC = () => {
  const {
    values,
    currentStep,
    initialCount,
    top20Count,
    top10Count,
    top5Count,
    toggleValueForCurrentStep,
    canProceedToNextStep,
    proceedToNextStep,
    goToPreviousStep,
    getStepInfo,
  } = useValuesOnboardingStore();

  const [validationError, setValidationError] = useState<string>('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const countShakeAnim = useRef(new Animated.Value(0)).current;

  const stepInfo = getStepInfo();

  // Get current count based on step
  const getCurrentCount = (): number => {
    switch (currentStep) {
      case 'broad':
        return initialCount();
      case 'top20':
        return top20Count();
      case 'top10':
        return top10Count();
      case 'top5':
        return top5Count();
      case 'summary':
        return top5Count();
      default:
        return 0;
    }
  };

  // Get required count for current step
  const getRequiredCount = (): number | null => {
    switch (currentStep) {
      case 'broad':
        return null; // Minimum 5, but no exact requirement shown
      case 'top20':
        return 20;
      case 'top10':
        return 10;
      case 'top5':
        return 5;
      case 'summary':
        return null;
      default:
        return null;
    }
  };

  // Get count display text
  const getCountText = (): string => {
    const current = getCurrentCount();
    const required = getRequiredCount();

    switch (currentStep) {
      case 'broad':
        return `Selected: ${current}`;
      case 'top20':
        return `${current} / 20 selected`;
      case 'top10':
        return `${current} / 10 selected`;
      case 'top5':
        return `${current} / 5 selected`;
      case 'summary':
        return `${current} core values`;
      default:
        return '';
    }
  };

  // Shake animation helper
  const triggerShake = (anim: Animated.Value): void => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = (): void => {
    if (!canProceedToNextStep()) {
      // Show validation error and shake animation
      const current = getCurrentCount();
      const required = getRequiredCount();

      if (currentStep === 'broad') {
        setValidationError('Please select at least 5 values to continue.');
      } else if (required !== null) {
        if (current < required) {
          setValidationError(`Please select ${required} values to continue.`);
        } else if (current > required) {
          setValidationError(`Please select exactly ${required} values.`);
        }
      }

      triggerShake(shakeAnim);
      triggerShake(countShakeAnim);

      // Clear error after 3 seconds
      setTimeout(() => {
        setValidationError('');
      }, 3000);

      return;
    }

    setValidationError('');
    proceedToNextStep();
  };

  const handleBack = (): void => {
    setValidationError('');
    goToPreviousStep();
  };

  const handleValuePress = (id: string): void => {
    // Don't allow toggling in summary step
    if (currentStep === 'summary') {
      return;
    }
    setValidationError(''); // Clear error on any interaction
    toggleValueForCurrentStep(id);
  };

  const handleEditValues = (): void => {
    // Go back to top5 step to edit
    useValuesOnboardingStore.getState().setCurrentStep('top5');
  };

  const handleComplete = async (): Promise<void> => {
    // Build values profile from store
    const { values } = useValuesOnboardingStore.getState();
    
    const top5Ids = values.filter((v) => v.tier === 'top5').map((v) => v.id);
    const top10Ids = values.filter((v) => v.tier === 'top10' || v.tier === 'top5').map((v) => v.id);
    const top20Ids = values.filter((v) => v.tier === 'top20' || v.tier === 'top10' || v.tier === 'top5').map((v) => v.id);
    const initialIds = values.filter((v) => v.tier !== 'none').map((v) => v.id);

    const valuesProfile: UserValuesProfile = {
      allValues: values,
      top5Ids,
      top10Ids,
      top20Ids,
      initialIds,
    };

    // Save to user store
    const { updateValuesProfile } = useUserStore.getState();
    await updateValuesProfile(valuesProfile);

    // Navigate to main app (onboarding complete)
    // Navigation will be handled by AppNavigator based on isValuesComplete flag
  };

  // Render summary step with legend
  if (currentStep === 'summary') {
    return (
      <ScreenContainer contentPadding={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{stepInfo.title}</Text>
          <Text style={styles.subtitle}>{stepInfo.subtitle}</Text>
        </View>

        <ValuesCloud values={values} onValuePress={handleValuePress} />

        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Legend:</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={styles.legendText}>Core 5</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#90CAF9' }]} />
              <Text style={styles.legendText}>Next 5</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E3F2FD' }]} />
              <Text style={styles.legendText}>Top 20</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.backgroundSecondary }]} />
              <Text style={styles.legendText}>Other values</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            title="Done"
            onPress={handleComplete}
            style={styles.doneButton}
          />
          <SecondaryButton
            title="Edit Values"
            onPress={handleEditValues}
            style={styles.editButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Render regular steps
  return (
    <ScreenContainer contentPadding={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{stepInfo.title}</Text>
        <Text style={styles.subtitle}>{stepInfo.subtitle}</Text>
      </View>

      <ValuesCloud values={values} onValuePress={handleValuePress} />

      <View style={styles.footer}>
        <View style={styles.footerTop}>
          <Animated.View
            style={[
              styles.countContainer,
              {
                transform: [{ translateX: countShakeAnim }],
              },
            ]}
          >
            <Text style={styles.countText}>{getCountText()}</Text>
          </Animated.View>
          <Text style={styles.stepIndicator}>
            Step {stepInfo.stepNumber} of {stepInfo.totalSteps}
          </Text>
        </View>

        {validationError ? (
          <Text style={styles.validationError}>{validationError}</Text>
        ) : null}

        <View style={styles.buttonRow}>
          {currentStep !== 'broad' && (
            <View style={styles.backButton}>
              <SecondaryButton
                title="Back"
                onPress={handleBack}
              />
            </View>
          )}
          <Animated.View
            style={[
              styles.nextButtonContainer,
              {
                transform: [{ translateX: shakeAnim }],
              },
              currentStep === 'broad' && styles.nextButtonFullWidth,
            ]}
          >
            <PrimaryButton
              title="Next"
              onPress={handleNext}
              disabled={false} // We handle validation ourselves
            />
          </Animated.View>
        </View>

        {currentStep === 'broad' && initialCount() < 5 && (
          <Text style={styles.hint}>
            Select at least 5 values to continue
          </Text>
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
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  footerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  countContainer: {
    flex: 1,
  },
  countText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  stepIndicator: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  validationError: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  nextButtonContainer: {
    flex: 1,
  },
  nextButtonFullWidth: {
    flex: 1,
  },
  hint: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  legendContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  legendTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.xs,
  },
  legendText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  doneButton: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  editButton: {
    width: '100%',
  },
});
