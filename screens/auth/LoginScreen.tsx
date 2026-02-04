/**
 * Login Screen
 * Unified authentication screen supporting Google, Apple, and Phone sign-in
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { GoogleButton } from '../../components/GoogleButton';
import { AppleButton } from '../../components/AppleButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../types/auth';
import { showAuthError, logAuthError } from '../../utils/errorHandler';
import { theme } from '../../theme';
import { RootStackParamList } from '../../navigation/types';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { signInWithGoogle, signInWithApple, startPhoneSignIn, confirmPhoneCode, phoneAuthState, loading, clearPhoneAuthState } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // Navigation will automatically update based on auth state
    } catch (error) {
      logAuthError('LoginScreen', error);
      showAuthError(error, 'Sign In Error');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      // Navigation will automatically update based on auth state
    } catch (error) {
      logAuthError('LoginScreen', error);
      showAuthError(error, 'Sign In Error');
    }
  };


  if (loading) {
    return (
      <ScreenContainer style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Signing in...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Choose your preferred sign-in method</Text>

        {!showOtpInput ? (
          <>
            {/* Social Sign-In Buttons */}
            <View style={styles.buttonContainer}>
              {/* Apple Sign-In (iOS only) - shown first on iOS per Apple guidelines */}
              {Platform.OS === 'ios' && (
                <AppleButton
                  onPress={handleAppleSignIn}
                  disabled={loading}
                  loading={loading}
                  variant="black"
                  style={styles.appleButton}
                />
              )}
              <GoogleButton
                onPress={handleGoogleSignIn}
                disabled={loading}
                loading={loading}
                style={styles.googleButton}
              />
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Phone Sign-In */}
            <View style={styles.phoneContainer}>
              <PrimaryButton
                title="Continue with Phone"
                onPress={() => navigation.navigate('PhoneSignIn')}
                style={styles.button}
              />
            </View>
          </>
        ) : (
          <>
            {/* OTP Input */}
            <View style={styles.otpContainer}>
              <Text style={styles.otpLabel}>Enter Verification Code</Text>
              <Text style={styles.otpSubtext}>
                We sent a code to {phoneNumber}
              </Text>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor={theme.colors.textTertiary}
                value={otpCode}
                onChangeText={(text) => setOtpCode(text.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <View style={styles.otpButtons}>
                <SecondaryButton
                  title="Cancel"
                  onPress={handleCancelPhoneAuth}
                  style={styles.cancelButton}
                />
                <PrimaryButton
                  title="Verify"
                  onPress={handlePhoneCodeConfirm}
                  style={styles.verifyButton}
                  disabled={otpCode.length !== 6}
                />
              </View>
            </View>
          </>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    width: '100%',
  },
  googleButton: {
    width: '100%',
  },
  appleButton: {
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  phoneContainer: {
    gap: theme.spacing.md,
  },
});
