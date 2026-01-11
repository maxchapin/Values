import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Value } from '../types/value';

interface ValueCardProps {
  value: Value;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const ValueCard: React.FC<ValueCardProps> = ({
  value,
  isSelected,
  onPress,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        disabled && styles.cardDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.name, isSelected && styles.nameSelected]}>
        {value.name}
      </Text>
      {value.description && (
        <Text style={[styles.description, isSelected && styles.descriptionSelected]}>
          {value.description}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  cardSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  nameSelected: {
    color: '#fff',
  },
  description: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  descriptionSelected: {
    color: '#fff',
    opacity: 0.9,
  },
});
