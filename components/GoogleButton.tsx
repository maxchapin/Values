/**
 * Google Sign-In Button
 * Styled button matching Google's design guidelines
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

export interface GoogleButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
}

/**
 * Google Sign-In Button
 * Follows Google's brand guidelines for sign-in buttons
 */
export const GoogleButton: React.FC<GoogleButtonProps> = ({
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color="#4285F4" style={styles.loader} />
        ) : (
          <GoogleIcon />
        )}
        <Text style={styles.text}>Continue with Google</Text>
      </View>
    </Pressable>
  );
};

/**
 * Google "G" Icon
 * Simple SVG-like icon using View components
 */
const GoogleIcon: React.FC = () => (
  <View style={styles.icon}>
    <View style={styles.iconInner}>
      <View style={styles.iconG}>
        <View style={styles.iconGTop} />
        <View style={styles.iconGBottom} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonPressed: {
    backgroundColor: '#F8F9FA',
    borderColor: '#C4C7C5',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInner: {
    width: 18,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconG: {
    width: 12,
    height: 12,
    position: 'relative',
  },
  iconGTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    height: 6,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 1,
  },
  iconGBottom: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderBottomRightRadius: 1,
  },
  text: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: '#3C4043',
    letterSpacing: 0.25,
  },
  loader: {
    marginRight: 12,
  },
});
