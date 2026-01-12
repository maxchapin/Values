import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Value } from '../types/value';
import { theme } from '../theme';

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
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  cardSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  name: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  nameSelected: {
    color: theme.colors.textInverse,
  },
  description: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.normal,
  },
  descriptionSelected: {
    color: theme.colors.textInverse,
    opacity: 0.9,
  },
});
