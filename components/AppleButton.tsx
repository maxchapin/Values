/**
 * Apple Sign-In Button
 * Uses expo-apple-authentication's native button — required by Apple HIG and App Store guidelines.
 * iOS only.
 */

import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export interface AppleButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
  variant?: 'black' | 'white' | 'white-outline';
}

export const AppleButton: React.FC<AppleButtonProps> = ({
  onPress,
  disabled = false,
  loading = false,
  style,
  variant = 'black',
}) => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  const buttonStyle =
    variant === 'black'
      ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={buttonStyle}
      cornerRadius={8}
      style={[styles.button, style]}
      onPress={disabled || loading ? undefined : onPress}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 50,
  },
});
