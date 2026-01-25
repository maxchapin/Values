import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

export interface TextInputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  onBlur?: () => void;
}

export const TextInputField = React.forwardRef<TextInput, TextInputFieldProps>(({
  label,
  error,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  style,
  ...textInputProps
}, ref) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      )}
      <TextInput
        ref={ref}
        style={[
          styles.input,
          error && styles.inputError,
          inputStyle,
          style,
        ]}
        placeholderTextColor={theme.colors.textTertiary}
        {...textInputProps}
      />
      {error && (
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      )}
    </View>
  );
});

TextInputField.displayName = 'TextInputField';

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.base,
    fontSize: theme.typography.fontSize.base,
    backgroundColor: theme.colors.backgroundTertiary,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  error: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});
