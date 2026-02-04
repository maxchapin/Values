/**
 * Auth Service
 * Handles authentication with Google, Apple, and Phone providers
 * Uses expo-auth-session for Google OAuth (production-ready)
 */

import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import type { AuthUser, AuthProvider, AuthSession as AuthSessionType, PhoneAuthState } from '../types/auth';
import { AuthError } from '../types/auth';
import { loginWithGoogle, loginWithApple, verifyPhoneCode } from './backendAuthApi';

// Complete web browser auth session for proper OAuth flow
WebBrowser.maybeCompleteAuthSession();

// Mock storage for phone verification codes (in real app, this would be backend)
const mockPhoneCodes = new Map<string, { code: string; expiresAt: number }>();

/**
 * Generate a mock 6-digit OTP code
 */
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Mock backend API interface
 * Replace these implementations with real backend calls
 */
export const authService = {
  /**
   * Sign in with Google using OAuth 2.0
   * Uses expo-auth-session for production-ready Google authentication
   * 
   * Flow:
   * 1. Request Google OAuth authorization code
   * 2. Exchange code for ID token (via backend or directly)
   * 3. Send ID token to backend for validation
   * 4. Backend returns user + session
   */
  async signInWithGoogle(): Promise<{ user: AuthUser; session: AuthSessionType }> {
    try {
      // Generate code verifier for PKCE (recommended security)
      // Code verifier should be a random string, then we hash it to get the challenge
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      // Convert Uint8Array to base64url string (URL-safe base64)
      // PKCE spec requires base64url encoding (RFC 7636)
      const base64 = btoa(String.fromCharCode(...Array.from(randomBytes)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const codeVerifier = base64;
      
      // Generate code challenge from verifier using SHA256
      // expo-crypto only supports BASE64 and HEX, so we use BASE64 then convert to BASE64URL
      const base64Digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      
      // Convert BASE64 to BASE64URL (URL-safe) for PKCE compliance
      // Replace + with -, / with _, and remove = padding
      const codeChallenge = base64Digest
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      // Google OAuth configuration
      // Get client ID from environment or app.json extra config
      const Constants = require('expo-constants').default;
      const clientId = 
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 
        Constants.expoConfig?.extra?.googleClientId || 
        '';
      
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: Constants.expoConfig?.scheme || 'values',
        path: 'auth',
      });

      if (!clientId) {
        throw new AuthError(
          'Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment.',
          'GOOGLE_CONFIG_ERROR',
          'google'
        );
      }

      // Request authorization using OAuth 2.0 with OpenID Connect
      // Using code flow with PKCE for security
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code, // Use code flow
        redirectUri,
        usePKCE: true,
        codeChallenge: codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
        codeVerifier: codeVerifier,
        additionalParameters: {
          access_type: 'offline', // Request refresh token
        },
      });

      // Perform authentication
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        useProxy: Platform.OS === 'web' ? false : true, // Use Expo proxy for native, direct for web
      });

      // Handle cancellation
      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new AuthError('Sign in cancelled by user', 'USER_CANCELLED', 'google');
      }

      // Handle error
      if (result.type === 'error') {
        const error = result.error || 'Unknown error';
        const errorDescription = (result.params as any)?.error_description || '';
        throw new AuthError(
          `Google sign-in failed: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`,
          'GOOGLE_SIGN_IN_ERROR',
          'google'
        );
      }

      // Extract authorization code
      if (result.type !== 'success' || !result.params?.code) {
        throw new AuthError('No authorization code received from Google', 'NO_AUTH_CODE', 'google');
      }

      const authCode = result.params.code as string;

      // Exchange authorization code for ID token
      // In production, this should be done on your backend for security
      // For now, we'll use Google's token endpoint directly (development only)
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          code: authCode,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new AuthError(
          `Token exchange failed: ${errorText}`,
          'TOKEN_EXCHANGE_ERROR',
          'google'
        );
      }

      const tokenData = await tokenResponse.json();
      const idToken = tokenData.id_token;

      if (!idToken) {
        throw new AuthError('No ID token in token response', 'NO_ID_TOKEN', 'google');
      }

      if (__DEV__) {
        console.log('[authService] Google OAuth successful, exchanging token with backend...');
      }

      // Exchange ID token with backend (or process locally in dev)
      const { user, session } = await loginWithGoogle(idToken);

      if (__DEV__) {
        console.log('[authService] Google sign-in complete:', user.id);
      }

      return { user, session };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof Error) {
        if (error.message.includes('Network')) {
          throw new AuthError(
            'Network error. Please check your internet connection.',
            'NETWORK_ERROR',
            'google'
          );
        }
        throw new AuthError(
          error.message || 'Failed to sign in with Google',
          'GOOGLE_SIGN_IN_ERROR',
          'google'
        );
      }

      throw new AuthError(
        'An unexpected error occurred during Google sign-in',
        'UNKNOWN_ERROR',
        'google'
      );
    }
  },

  /**
   * Sign in with Apple using native Apple Authentication
   * Uses expo-apple-authentication for iOS-only sign-in
   * 
   * Important: Apple only provides name/email on FIRST sign-in.
   * Subsequent sign-ins will not include this data for privacy.
   * 
   * Flow:
   * 1. Request Apple authentication credential
   * 2. Extract identity token and user info (if available)
   * 3. Send identity token to backend for validation
   * 4. Backend returns user + session
   */
  async signInWithApple(): Promise<{ user: AuthUser; session: AuthSessionType }> {
    // Platform check - Apple Sign In is iOS only
    if (Platform.OS !== 'ios') {
      throw new AuthError('Apple Sign In is only available on iOS', 'APPLE_IOS_ONLY', 'apple');
    }

    // Check if Apple Authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new AuthError(
        'Apple Sign In is not available on this device',
        'APPLE_NOT_AVAILABLE',
        'apple'
      );
    }

    try {
      if (__DEV__) {
        console.log('[authService] Starting Apple Sign In...');
      }

      // Request Apple authentication credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Handle cancellation
      if (!credential.identityToken) {
        throw new AuthError('Sign in cancelled by user', 'USER_CANCELLED', 'apple');
      }

      // Extract user information
      // Note: fullName and email are ONLY available on FIRST sign-in
      // Subsequent sign-ins will have these as null/undefined
      const identityToken = credential.identityToken;
      const userIdentifier = credential.user; // Stable Apple user ID
      const fullName = credential.fullName;
      const email = credential.email;

      if (__DEV__) {
        console.log('[authService] Apple credential received:', {
          userIdentifier,
          hasFullName: !!fullName,
          hasEmail: !!email,
          firstName: fullName?.givenName,
          lastName: fullName?.familyName,
        });
      }

      // Exchange identity token with backend
      const { user, session } = await loginWithApple(
        identityToken,
        userIdentifier,
        fullName,
        email
      );

      if (__DEV__) {
        console.log('[authService] Apple sign-in complete:', user.id);
      }

      return { user, session };
    } catch (error) {
      // Handle Apple Authentication errors
      if (error instanceof AppleAuthentication.AppleAuthenticationError) {
        // User cancelled
        if (error.code === AppleAuthentication.AppleAuthenticationError.CANCELED) {
          throw new AuthError('Sign in cancelled by user', 'USER_CANCELLED', 'apple');
        }
        // Other Apple errors
        throw new AuthError(
          `Apple Sign In failed: ${error.message}`,
          'APPLE_SIGN_IN_ERROR',
          'apple'
        );
      }

      // Handle our custom AuthError
      if (error instanceof AuthError) {
        throw error;
      }

      // Handle other errors
      if (error instanceof Error) {
        throw new AuthError(
          error.message || 'Failed to sign in with Apple',
          'APPLE_SIGN_IN_ERROR',
          'apple'
        );
      }

      throw new AuthError(
        'An unexpected error occurred during Apple sign-in',
        'UNKNOWN_ERROR',
        'apple'
      );
    }
  },

  /**
   * Start phone number sign-in (send OTP code)
   * In production, this would:
   * 1. Validate phone number format
   * 2. Send phone number to backend: POST /auth/phone/start { phoneNumber }
   * 3. Backend sends SMS via Twilio/Firebase/etc.
   * 4. Backend returns verificationId
   */
  async startPhoneSignIn(phoneNumber: string): Promise<PhoneAuthState> {
    // Normalize phone number (remove non-digits, but keep + for international)
    const cleaned = phoneNumber.trim();
    const normalized = cleaned.replace(/[^\d+]/g, '');

    // Basic validation: should have at least 10 digits (US) or 7-15 digits (international)
    const digitsOnly = normalized.replace(/\D/g, '');
    
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      throw new AuthError(
        'Please enter a valid phone number (10-15 digits)',
        'INVALID_PHONE',
        'phone'
      );
    }

    // Mock: generate and store OTP code
    // In production, backend would send SMS via Twilio/Firebase/etc.
    const code = generateOTPCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    mockPhoneCodes.set(normalized, { code, expiresAt });

    if (__DEV__) {
      console.log(`[authService] Mock OTP code for ${normalized}: ${code}`);
      console.log('[authService] In production, this would send SMS via backend');
      console.log('[authService] Example backend call: POST /auth/phone/start { phoneNumber }');
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      phoneNumber: normalized,
      verificationId: `mock_verification_${Date.now()}`,
      codeSent: true,
      codeVerified: false,
    };
  },

  /**
   * Confirm phone OTP code
   * In production, this would:
   * 1. Send code + verificationId to backend: POST /auth/phone/verify { code, verificationId, phoneNumber }
   * 2. Backend validates code and returns user + session
   */
  async confirmPhoneCode(
    phoneNumber: string,
    code: string
  ): Promise<{ user: AuthUser; session: AuthSessionType }> {
    const normalized = phoneNumber.replace(/[^\d+]/g, '');
    const stored = mockPhoneCodes.get(normalized);

    if (!stored) {
      throw new AuthError(
        'No verification code found for this phone number. Please request a new code.',
        'CODE_NOT_FOUND',
        'phone'
      );
    }

    if (Date.now() > stored.expiresAt) {
      mockPhoneCodes.delete(normalized);
      throw new AuthError(
        'Verification code has expired. Please request a new code.',
        'CODE_EXPIRED',
        'phone'
      );
    }

    if (stored.code !== code.trim()) {
      throw new AuthError('Invalid verification code. Please try again.', 'INVALID_CODE', 'phone');
    }

    // Code is valid - exchange with backend
    // In production, backend would validate and return user + session
    const verificationId = `mock_verification_${normalized}`;
    const { user, session } = await verifyPhoneCode(normalized, code, verificationId);

    // Clean up stored code after successful verification
    mockPhoneCodes.delete(normalized);

    if (__DEV__) {
      console.log('[authService] Phone verification successful:', user.id);
    }

    return { user, session };
  },

  /**
   * Validate and refresh session token
   * In production, this would call backend to refresh expired tokens
   * 
   * Security: Always validate tokens server-side in production
   */
  async validateSession(session: AuthSessionType): Promise<boolean> {
    if (!session.expiresAt) {
      return true; // No expiration - still valid (but should be validated server-side)
    }

    const now = Date.now();
    const expiresAt = session.expiresAt;
    const timeUntilExpiry = expiresAt - now;

    // If expired, attempt refresh (if refresh token available)
    if (timeUntilExpiry <= 0) {
      if (session.refreshToken) {
        // TODO: In production, call backend to refresh token
        // const refreshed = await refreshToken(session.refreshToken);
        // return refreshed !== null;
        if (__DEV__) {
          console.log('[authService] Session expired, would refresh token in production');
        }
      }
      return false; // Expired and no refresh token
    }

    // If expiring soon (within 5 minutes), proactively refresh
    if (timeUntilExpiry < 5 * 60 * 1000 && session.refreshToken) {
      // TODO: In production, proactively refresh token
      if (__DEV__) {
        console.log('[authService] Session expiring soon, would refresh token in production');
      }
    }

    return true; // Still valid
  },
};
