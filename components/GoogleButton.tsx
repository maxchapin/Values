/**
 * Google Sign-In Button
 * Styled button matching Google's design guidelines
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
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
          <AntDesign name="google" size={20} color="#4285F4" style={styles.icon} />
        )}
        <Text style={styles.text}>Continue with Google</Text>
      </View>
    </Pressable>
  );
};

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
    marginRight: 12,
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
