/**
 * Authentication domain types
 * Unified auth layer supporting Google, Apple, and Phone authentication
 */

export type AuthProvider = 'google' | 'apple' | 'phone';

/**
 * Core authenticated user type
 * This is the minimal user shape after authentication, before profile completion
 */
export interface AuthUser {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string; // Optional - phone-only users might not have email
  phoneNumber?: string; // Optional - email-only users might not have phone
  photoUrl?: string;
  authProvider: AuthProvider;
  createdAt: string;
  updatedAt?: string;
  
  // Onboarding status flags
  isOnboardingComplete?: boolean;
  isProfileComplete?: boolean;
  isValuesComplete?: boolean;
  
  // Future extensibility
  // subscriptionFlags?: SubscriptionFlags;
  // preferences?: UserPreferences;
}

/**
 * Phone authentication state
 * Used during OTP flow
 */
export interface PhoneAuthState {
  phoneNumber: string;
  verificationId?: string; // For backend verification
  codeSent: boolean;
  codeVerified: boolean;
}

/**
 * Auth session data persisted in secure storage
 */
export interface AuthSession {
  userId: string;
  authProvider: AuthProvider;
  token?: string; // Provider token (e.g., Google ID token, Apple identity token)
  refreshToken?: string; // For token refresh
  expiresAt?: number; // Unix timestamp
}

/**
 * Auth error types
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: AuthProvider
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
