import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import { theme } from '../theme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * LoadingSpinner component
 * 
 * A reusable loading indicator with optional message.
 * Can be used as a full-screen loader or inline.
 * 
 * @example
 * // Full screen
 * <LoadingSpinner message="Loading matches..." />
 * 
 * // Inline
 * <LoadingSpinner message="Loading..." fullScreen={false} />
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
  color = theme.colors.primary,
  fullScreen = true,
  containerStyle,
  textStyle,
}) => {
  const content = (
    <View style={[styles.container, containerStyle]}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text style={[styles.message, textStyle]}>{message}</Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <ScreenContainer style={styles.screenContainer}>
        {content}
      </ScreenContainer>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  screenContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  message: {
    marginTop: theme.spacing.base,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
