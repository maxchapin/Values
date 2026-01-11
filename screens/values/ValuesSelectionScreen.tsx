import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useValuesSelectionStore } from '../../store/valuesSelectionStore';
import { ValueCard } from '../../components/ValueCard';
import { PrimaryButton } from '../../components/PrimaryButton';
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

  // Load values on mount
  useEffect(() => {
    if (availableValues.length === 0) {
      loadValues();
    }
  }, [availableValues.length, loadValues]);

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
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading values...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
  count: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    padding: 20,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
