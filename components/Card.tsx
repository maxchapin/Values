import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /**
   * Card variant - affects background and border
   */
  variant?: 'default' | 'elevated' | 'outlined';
  /**
   * Padding inside the card
   */
  padding?: keyof typeof theme.spacing | number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'xl',
}) => {
  const paddingValue = typeof padding === 'number' ? padding : theme.spacing[padding];

  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && styles.cardElevated,
        variant === 'outlined' && styles.cardOutlined,
        { padding: paddingValue },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  cardElevated: {
    ...theme.shadows.md,
    borderWidth: 0,
  },
  cardOutlined: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
