import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

interface TagPillProps {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const TagPill: React.FC<TagPillProps> = ({
  label,
  onPress,
  selected = false,
  disabled = false,
  style,
  textStyle,
  size = 'md',
}) => {
  const sizeStyles = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  };

  const sizeTextStyles = {
    sm: styles.sizeTextSm,
    md: styles.sizeTextMd,
    lg: styles.sizeTextLg,
  };

  const Component = onPress ? TouchableOpacity : React.Fragment;
  const componentProps = onPress
    ? {
        onPress,
        disabled,
        activeOpacity: 0.7,
        style: [
          styles.pill,
          sizeStyles[size],
          selected && styles.pillSelected,
          disabled && styles.pillDisabled,
          style,
        ],
      }
    : {
        style: [
          styles.pill,
          sizeStyles[size],
          selected && styles.pillSelected,
          disabled && styles.pillDisabled,
          style,
        ],
      };

  return (
    <Component {...componentProps}>
      <Text
        style={[
          styles.text,
          sizeTextStyles[size],
          selected && styles.textSelected,
          disabled && styles.textDisabled,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Component>
  );
};

const styles = StyleSheet.create({
  pill: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  pillSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillDisabled: {
    opacity: 0.5,
  },
  text: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  textSelected: {
    color: theme.colors.textInverse,
  },
  textDisabled: {
    color: theme.colors.disabledText,
  },
  // Size variants
  sizeSm: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  sizeMd: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  sizeLg: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sizeTextSm: {
    fontSize: theme.typography.fontSize.xs,
  },
  sizeTextMd: {
    fontSize: theme.typography.fontSize.sm,
  },
  sizeTextLg: {
    fontSize: theme.typography.fontSize.base,
  },
});
