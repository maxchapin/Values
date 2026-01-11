import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useValuesSelectionStore } from '../../store/valuesSelectionStore';
import { ValueCard } from '../../components/ValueCard';
import { PrimaryButton } from '../../components/PrimaryButton';
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
    canProceedToNextStep,
    proceedToNextStep,
    addValue,
    removeValue,
    getRequiredCountForStep,
    goToPreviousStep,
    getCurrentSelections,
  } = useValuesSelectionStore();

  // Determine current step from route name
  const getCurrentStep = (): ValuesSelectionStep => {
    if (route.name === 'ValuesNarrow20') return ValuesSelectionStep.NARROW_20;
    if (route.name === 'ValuesNarrow10') return ValuesSelectionStep.NARROW_10;
    return ValuesSelectionStep.NARROW_20;
  };

  const currentStep = getCurrentStep();
  const requiredCount = getRequiredCountForStep(currentStep);
  const currentSelections = getCurrentSelections();
  const currentCount = currentSelections.length;
  const remaining = requiredCount ? requiredCount - currentCount : 0;

  // For narrowing, show only values from previous step
  const valuesToShow = currentStep === ValuesSelectionStep.NARROW_20
    ? availableValues.filter((v) => selectedAny.includes(v.id))
    : availableValues.filter((v) => top20.includes(v.id));

  const handleValuePress = (valueId: string): void => {
    if (currentSelections.includes(valueId)) {
      removeValue(valueId);
    } else {
      if (requiredCount && currentCount < requiredCount) {
        addValue(valueId);
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
    <View style={styles.container}>
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
          <PrimaryButton
            title="Back"
            onPress={handleBack}
            style={[styles.backButton, { backgroundColor: '#ccc' }]}
            textStyle={{ color: '#333' }}
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
