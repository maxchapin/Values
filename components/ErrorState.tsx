import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import { PrimaryButton } from './PrimaryButton';
import { theme } from '../theme';

interface ErrorStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  fullScreen?: boolean;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
}

/**
 * ErrorState component
 * 
 * A reusable error display for when something goes wrong.
 * Similar to EmptyState but specifically for error scenarios.
 * 
 * @example
 * <ErrorState
 *   message="Failed to load matches"
 *   actionLabel="Try Again"
 *   onAction={handleRetry}
 * />
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  actionLabel,
  onAction,
  fullScreen = true,
  containerStyle,
  titleStyle,
  messageStyle,
}) => {
  const content = (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      <Text style={[styles.message, messageStyle]}>{message}</Text>
      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <PrimaryButton
            title={actionLabel}
            onPress={onAction}
            style={styles.actionButton}
          />
        </View>
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
    paddingTop: theme.spacing['4xl'],
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.lg,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 300,
  },
  actionButton: {
    width: '100%',
  },
});
