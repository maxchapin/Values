/**
 * Apple Sign-In Button
 * Styled button matching Apple's Human Interface Guidelines
 * iOS only - follows Apple's design requirements
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { theme } from '../theme';

export interface AppleButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
  /**
   * Button style variant
   * - 'black': Black background with white text (default)
   * - 'white': White background with black text
   * - 'white-outline': White background with black text and border
   */
  variant?: 'black' | 'white' | 'white-outline';
}

/**
 * Apple Sign-In Button
 * Follows Apple's Human Interface Guidelines for Sign in with Apple buttons
 * 
 * Requirements:
 * - Must use Apple's exact wording: "Sign in with Apple" or "Continue with Apple"
 * - Must use Apple's SF Symbols or approved iconography
 * - Must follow Apple's color and styling guidelines
 */
export const AppleButton: React.FC<AppleButtonProps> = ({
  onPress,
  disabled = false,
  loading = false,
  style,
  variant = 'black',
}) => {
  // Only show on iOS
  if (Platform.OS !== 'ios') {
    return null;
  }

  const buttonStyle = variant === 'black' 
    ? styles.buttonBlack 
    : variant === 'white-outline'
    ? styles.buttonWhiteOutline
    : styles.buttonWhite;

  const textStyle = variant === 'black' 
    ? styles.textBlack 
    : styles.textWhite;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={null} // iOS doesn't use ripple
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'black' ? '#FFFFFF' : '#000000'} 
            style={styles.loader} 
          />
        ) : (
          <AppleIcon variant={variant} />
        )}
        <Text style={[styles.text, textStyle]}>Continue with Apple</Text>
      </View>
    </Pressable>
  );
};

/**
 * Apple Logo Icon
 * Simple representation of Apple logo using View components
 * In production, consider using SF Symbols or Apple's official icon assets
 */
const AppleIcon: React.FC<{ variant: 'black' | 'white' | 'white-outline' }> = ({ variant }) => {
  const iconColor = variant === 'black' ? '#FFFFFF' : '#000000';
  
  return (
    <View style={styles.icon}>
      <View style={[styles.iconShape, { borderColor: iconColor }]}>
        <View style={[styles.iconLeaf, { backgroundColor: iconColor }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonBlack: {
    backgroundColor: '#000000',
  },
  buttonWhite: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  buttonWhiteOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconShape: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLeaf: {
    width: 8,
    height: 10,
    borderRadius: 1,
    position: 'absolute',
    top: 2,
    left: 4,
  },
  text: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    letterSpacing: 0.3,
  },
  textBlack: {
    color: '#FFFFFF',
  },
  textWhite: {
    color: '#000000',
  },
  loader: {
    marginRight: 8,
  },
});
