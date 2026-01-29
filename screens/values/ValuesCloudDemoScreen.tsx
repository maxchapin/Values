/**
 * ValuesCloudDemoScreen
 * Demo screen showing the ValuesCloud component wired to the valuesOnboardingStore
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useValuesOnboardingStore } from '../../store/valuesOnboardingStore';
import { ValuesCloud } from '../../components/ValuesCloud';
import { ScreenContainer } from '../../components/ScreenContainer';
import { theme } from '../../theme';

export const ValuesCloudDemoScreen: React.FC = () => {
  const {
    values,
    currentStep,
    initialCount,
    top20Count,
    top10Count,
    top5Count,
    toggleValueForCurrentStep,
  } = useValuesOnboardingStore();

  // Log tier changes when values are toggled
  useEffect(() => {
    if (__DEV__) {
      const top5 = values.filter((v) => v.tier === 'top5');
      const top10 = values.filter((v) => v.tier === 'top10');
      const top20 = values.filter((v) => v.tier === 'top20');
      const initial = values.filter((v) => v.tier === 'initial');
      const none = values.filter((v) => v.tier === 'none');

      console.log('[ValuesCloudDemo] Tier distribution:', {
        top5: top5.length,
        top10: top10.length,
        top20: top20.length,
        initial: initial.length,
        none: none.length,
        currentStep,
      });
    }
  }, [values, currentStep]);

  const handleValuePress = (id: string): void => {
    if (__DEV__) {
      const value = values.find((v) => v.id === id);
      console.log(`[ValuesCloudDemo] Toggling value: ${value?.label} (${value?.tier})`);
    }

    toggleValueForCurrentStep(id);

    if (__DEV__) {
      // Log after toggle
      setTimeout(() => {
        const updatedValue = useValuesOnboardingStore.getState().values.find((v) => v.id === id);
        console.log(`[ValuesCloudDemo] Value updated: ${updatedValue?.label} → ${updatedValue?.tier}`);
      }, 100);
    }
  };

  return (
    <ScreenContainer contentPadding={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Values Cloud Demo</Text>
        <Text style={styles.subtitle}>
          Tap values to toggle their tiers. Current step: <Text style={styles.stepText}>{currentStep}</Text>
        </Text>

        <View style={styles.countsContainer}>
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Initial:</Text>
            <Text style={styles.countValue}>{initialCount()}</Text>
          </View>
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Top 20:</Text>
            <Text style={styles.countValue}>{top20Count()}</Text>
          </View>
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Top 10:</Text>
            <Text style={styles.countValue}>{top10Count()}</Text>
          </View>
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Top 5:</Text>
            <Text style={[styles.countValue, styles.countValueTop5]}>{top5Count()}</Text>
          </View>
        </View>
      </View>

      <ValuesCloud values={values} onValuePress={handleValuePress} />
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
  stepText: {
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  countsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  countLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  countValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  countValueTop5: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.fontSize.lg,
  },
});
