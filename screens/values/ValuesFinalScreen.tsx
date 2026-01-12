import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useValuesSelectionStore } from '../../store/valuesSelectionStore';
import { useUserStore } from '../../store/userStore';
import { ValueCard } from '../../components/ValueCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { trackScreenView, trackValueSelection, trackOnboardingCompleted } from '../../services/analytics';
import { ScreenContainer } from '../../components/ScreenContainer';
import { theme } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { ValuesSelectionStep } from '../../types/value';

type ValuesFinalScreenProps = NativeStackScreenProps<RootStackParamList, 'ValuesFinal5'>;

export const ValuesFinalScreen: React.FC<ValuesFinalScreenProps> = ({ navigation }) => {
  const {
    top5,
    top10,
    availableValues,
    canProceedToNextStep,
    proceedToNextStep,
    addValue,
    removeValue,
    getRequiredCountForStep,
    goToPreviousStep,
    getCurrentSelections,
  } = useValuesSelectionStore();

  const { updateValues } = useUserStore();

  const currentStep = ValuesSelectionStep.FINAL_5;
  const requiredCount = getRequiredCountForStep(currentStep);
  const currentSelections = getCurrentSelections();
  const currentCount = currentSelections.length;
  const remaining = requiredCount ? requiredCount - currentCount : 0;

  // Show values from top10 for final selection
  const valuesToShow = availableValues.filter((v) => top10.includes(v.id));

  const handleValuePress = (valueId: string): void => {
    if (currentSelections.includes(valueId)) {
      removeValue(valueId);
    } else {
      if (requiredCount && currentCount < requiredCount) {
        addValue(valueId);
      }
    }
  };

  const handleComplete = async (): Promise<void> => {
    if (!canProceedToNextStep()) {
      return;
    }

    proceedToNextStep();

    // Save final values to user store
    const finalValues = useValuesSelectionStore.getState().top5;
    await updateValues(finalValues);

    // Track onboarding completion
    trackOnboardingCompleted({
      finalValuesCount: finalValues.length,
    });

    // Track final value selection
    trackValueSelection('final_5', finalValues.length);

    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
  };

  const handleBack = (): void => {
    goToPreviousStep();
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Top 5 Values</Text>
        <Text style={styles.subtitle}>
          Choose your final 5 most important values. These will be used for matching.
        </Text>
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
            title="Complete"
            onPress={handleComplete}
            disabled={!canProceedToNextStep()}
            style={styles.continueButton}
          />
        </View>
        {!canProceedToNextStep() && requiredCount && (
          <Text style={styles.hint}>
            {currentCount < requiredCount
              ? `Select exactly ${requiredCount} values to complete`
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
