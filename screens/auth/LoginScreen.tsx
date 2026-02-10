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
import { supabase } from '../../services/supabase';

const ENABLE_APPLE_SIGN_IN = false;
const ENABLE_PHONE_SIGN_IN = false;

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { signInWithGoogle, signInWithApple, startPhoneSignIn, confirmPhoneCode, phoneAuthState, loading, clearPhoneAuthState } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  // DEBUG: Test Supabase connection
  const testSupabase = async () => {
    if (__DEV__) {
      console.log('[DEBUG] ===== Testing Supabase Connection =====');
    }
    try {
      const { data, error } = await supabase.auth.getSession();
      if (__DEV__) {
        console.log('[DEBUG] Supabase getSession result:', {
          hasSession: !!data.session,
          hasUser: !!data.session?.user,
          userId: data.session?.user?.id || null,
          error: error
            ? {
                message: error.message,
                status: error.status,
                name: error.name,
              }
            : null,
        });
        console.log('[DEBUG] Supabase client test completed, session check ran successfully');
      }
    } catch (testError) {
      if (__DEV__) {
        console.error('[DEBUG] Supabase test failed:', testError);
      }
    }
    if (__DEV__) {
      console.log('[DEBUG] ===== Supabase Test Complete =====');
    }
  };

  const handleGoogleSignIn = async () => {
    if (__DEV__) {
      console.log('[DEBUG] ===== Google Sign-In Button Pressed =====');
    }
    try {
      await signInWithGoogle();
      // Navigation will automatically update based on auth state
    } catch (error) {
      if (__DEV__) {
        console.error('[DEBUG] Google sign-in error in LoginScreen:', error);
      }
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

  // Phone auth handlers are kept for future use but gated behind ENABLE_PHONE_SIGN_IN
  const handleCancelPhoneAuth = () => {
    if (!ENABLE_PHONE_SIGN_IN) return;
    clearPhoneAuthState?.();
    setShowOtpInput(false);
    setOtpCode('');
    setPhoneNumber('');
  };

  const handlePhoneCodeConfirm = async () => {
    if (!ENABLE_PHONE_SIGN_IN) return;
    if (!otpCode || otpCode.length !== 6 || !phoneAuthState?.phoneNumber) {
      return;
    }
    try {
      await confirmPhoneCode(otpCode);
      setShowOtpInput(false);
    } catch (error) {
      logAuthError('LoginScreen', error);
      showAuthError(error, 'Verification Error');
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

        {ENABLE_PHONE_SIGN_IN && showOtpInput ? (
          <>
            {/* OTP Input (phone sign-in) */}
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
        ) : (
          <>
            {/* Social Sign-In Buttons */}
            <View style={styles.buttonContainer}>
              {/* Apple Sign-In (iOS only) - currently disabled at runtime */}
              {Platform.OS === 'ios' && ENABLE_APPLE_SIGN_IN && (
                <AppleButton
                  onPress={handleAppleSignIn}
                  disabled={loading}
                  loading={loading}
                  variant="black"
                  style={styles.appleButton}
                />
              )}
              {/* DEBUG: Test Supabase button - remove after debugging */}
              {__DEV__ && (
                <PrimaryButton
                  title="[DEBUG] Test Supabase"
                  onPress={testSupabase}
                  style={styles.googleButton}
                />
              )}
              <GoogleButton
                onPress={handleGoogleSignIn}
                disabled={loading}
                loading={loading}
                style={styles.googleButton}
              />
            </View>

            {/* Phone Sign-In entry point - currently disabled at runtime */}
            {ENABLE_PHONE_SIGN_IN && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.phoneContainer}>
                  <PrimaryButton
                    title="Continue with Phone"
                    // Phone auth is currently disabled; casting avoids type errors while keeping the route name for future use.
                    onPress={() => navigation.navigate('PhoneSignIn' as never)}
                    style={styles.button}
                  />
                </View>
              </>
            )}
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
  otpContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  otpLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  otpSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.xl,
    letterSpacing: 4,
    textAlign: 'center',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  otpButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  verifyButton: {
    flex: 1,
  },
});
