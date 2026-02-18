import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { theme } from '../theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional second action (e.g. "Feedback"). Rendered below the primary action. */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  fullScreen?: boolean;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
}

/**
 * EmptyState component
 * 
 * A reusable empty state display for when there's no data to show.
 * Can include an optional action button.
 * 
 * @example
 * <EmptyState
 *   icon="📭"
 *   title="No Matches Yet"
 *   message="Start swiping to find people you like!"
 *   actionLabel="Go to Discover"
 *   onAction={() => navigation.navigate('Discover')}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  fullScreen = true,
  containerStyle,
  titleStyle,
  messageStyle,
}) => {
  const content = (
    <View style={[styles.container, containerStyle]}>
      {icon && (
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      )}
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
      {secondaryActionLabel && onSecondaryAction && (
        <View style={styles.secondaryActionContainer}>
          <SecondaryButton
            title={secondaryActionLabel}
            onPress={onSecondaryAction}
            style={styles.secondaryActionButton}
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
    color: theme.colors.textSecondary,
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
  secondaryActionContainer: {
    width: '100%',
    maxWidth: 300,
    marginTop: theme.spacing.base,
  },
  secondaryActionButton: {
    width: '100%',
  },
});
