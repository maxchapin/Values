import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  
  button: {
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md + 2, // 14px
    paddingHorizontal: theme.spacing.xl, // 24px
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  buttonDisabled: {
    borderColor: theme.colors.disabled,
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  buttonTextDisabled: {
    color: theme.colors.disabledText,
  },
});
