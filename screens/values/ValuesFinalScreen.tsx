import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useValuesSelectionStore } from '../../store/valuesSelectionStore';
import { useUserStore } from '../../store/userStore';
import { ValueCard } from '../../components/ValueCard';
import { PrimaryButton } from '../../components/PrimaryButton';
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
    <View style={styles.container}>
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
          <PrimaryButton
            title="Back"
            onPress={handleBack}
            style={[styles.backButton, { backgroundColor: '#ccc' }]}
            textStyle={{ color: '#333' }}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    lineHeight: 22,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  countExact: {
    color: '#34C759',
  },
  remaining: {
    fontSize: 14,
    color: '#ff3b30',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#ff3b30',
    textAlign: 'center',
  },
});
