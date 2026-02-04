/**
 * Backend Auth API
 * Stub for backend authentication endpoints
 * Replace with real API calls when backend is ready
 */

import type { AuthUser, AuthSession } from '../types/auth';

/**
 * Exchange Google ID token for user session
 * In production, this would POST to your backend: POST /auth/google { idToken }
 */
export async function loginWithGoogle(idToken: string): Promise<{ user: AuthUser; session: AuthSession }> {
  // TODO: Replace with real backend API call
  // Example:
  // const response = await fetch(`${API_BASE_URL}/auth/google`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ idToken }),
  // });
  // if (!response.ok) throw new Error('Backend auth failed');
  // return await response.json();

  // For now, decode the ID token locally (development only)
  // In production, backend should validate and decode the token
  if (__DEV__) {
    console.log('[backendAuthApi] Mock backend call - would send idToken to backend');
    console.log('[backendAuthApi] In production, backend validates token and returns user + session');
  }

  // Mock: Parse token payload (in production, backend does this securely)
  // This is just for development - never trust client-side token parsing in production!
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    
    const user: AuthUser = {
      id: `google_${payload.sub}`, // Use Google subject ID for stable user ID
      displayName: payload.name,
      firstName: payload.given_name,
      lastName: payload.family_name,
      email: payload.email,
      photoUrl: payload.picture,
      authProvider: 'google',
      createdAt: new Date().toISOString(),
      isOnboardingComplete: false,
      isProfileComplete: false,
      isValuesComplete: false,
    };

    const session: AuthSession = {
      userId: user.id,
      authProvider: 'google',
      token: idToken, // Store ID token for backend validation
      expiresAt: payload.exp ? payload.exp * 1000 : undefined, // Convert Unix timestamp to milliseconds
    };

    return { user, session };
  } catch (error) {
    throw new Error('Failed to process Google token');
  }
}

/**
 * Exchange Apple identity token for user session
 * In production: POST /auth/apple { identityToken, userIdentifier, fullName?, email? }
 * 
 * Note: fullName and email are only provided on FIRST sign-in.
 * Subsequent sign-ins will have these as null/undefined.
 */
export async function loginWithApple(
  identityToken: string,
  userIdentifier: string,
  fullName: { givenName?: string | null; familyName?: string | null } | null,
  email: string | null
): Promise<{ user: AuthUser; session: AuthSession }> {
  // TODO: Replace with real backend API call
  // Example:
  // const response = await fetch(`${API_BASE_URL}/auth/apple`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ identityToken, userIdentifier, fullName, email }),
  // });
  // if (!response.ok) throw new Error('Backend auth failed');
  // return await response.json();

  // For now, decode the identity token locally (development only)
  // In production, backend should validate and decode the token
  if (__DEV__) {
    console.log('[backendAuthApi] Mock backend call - would send identityToken to backend');
    console.log('[backendAuthApi] In production, backend validates token and returns user + session');
  }

  // Mock: Parse token payload (in production, backend does this securely)
  // This is just for development - never trust client-side token parsing in production!
  try {
    // Apple's identity token is a JWT, decode it
    const payload = JSON.parse(atob(identityToken.split('.')[1]));
    
    // Use Apple's stable user identifier
    // This is consistent across sign-ins for the same Apple ID
    const userId = `apple_${userIdentifier}`;
    
    // Extract name from credential (only available on first sign-in)
    // If not available, try to get from token payload or use defaults
    const firstName = fullName?.givenName || payload?.given_name || null;
    const lastName = fullName?.familyName || payload?.family_name || null;
    const displayName = fullName 
      ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ') || undefined
      : payload?.name || undefined;
    
    // Extract email (only available on first sign-in)
    // Apple may provide a private relay email (e.g., user@privaterelay.appleid.com)
    const userEmail = email || payload?.email || null;

    const user: AuthUser = {
      id: userId,
      displayName: displayName || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: userEmail || undefined,
      photoUrl: undefined, // Apple doesn't provide profile photos
      authProvider: 'apple',
      createdAt: new Date().toISOString(),
      isOnboardingComplete: false,
      isProfileComplete: false,
      isValuesComplete: false,
    };

    const session: AuthSession = {
      userId: user.id,
      authProvider: 'apple',
      token: identityToken, // Store identity token for backend validation
      expiresAt: payload.exp ? payload.exp * 1000 : undefined, // Convert Unix timestamp to milliseconds
    };

    if (__DEV__) {
      console.log('[backendAuthApi] Apple user created:', {
        id: user.id,
        hasName: !!user.displayName,
        hasEmail: !!user.email,
        isFirstSignIn: !!(fullName || email),
      });
    }

    return { user, session };
  } catch (error) {
    throw new Error('Failed to process Apple identity token');
  }
}

/**
 * Verify phone OTP code and create/login user
 * In production: POST /auth/phone/verify { phoneNumber, code, verificationId }
 * 
 * Backend should:
 * 1. Validate the verification code
 * 2. Create user if new, or return existing user
 * 3. Return user + session token
 */
export async function verifyPhoneCode(
  phoneNumber: string,
  code: string,
  verificationId: string
): Promise<{ user: AuthUser; session: AuthSession }> {
  // TODO: Replace with real backend API call
  // Example:
  // const response = await fetch(`${API_BASE_URL}/auth/phone/verify`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ phoneNumber, code, verificationId }),
  // });
  // if (!response.ok) {
  //   const error = await response.json();
  //   throw new Error(error.message || 'Phone verification failed');
  // }
  // return await response.json();

  if (__DEV__) {
    console.log('[backendAuthApi] Mock backend call - would send verification to backend');
    console.log('[backendAuthApi] In production, backend validates code and returns user + session');
  }

  // Mock: Create user from phone number
  // In production, backend validates code and creates/returns user
  try {
    // Use phone number as stable identifier (backend would use its own user ID)
    const userId = `phone_${phoneNumber.replace(/\D/g, '')}`;

    const user: AuthUser = {
      id: userId,
      displayName: undefined, // User will set this during onboarding
      phoneNumber: phoneNumber,
      authProvider: 'phone',
      createdAt: new Date().toISOString(),
      isOnboardingComplete: false,
      isProfileComplete: false,
      isValuesComplete: false,
    };

    const session: AuthSession = {
      userId: user.id,
      authProvider: 'phone',
      token: `mock_phone_token_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      expiresAt: Date.now() + 3600000, // 1 hour
    };

    if (__DEV__) {
      console.log('[backendAuthApi] Phone user created:', {
        id: user.id,
        phoneNumber: user.phoneNumber,
      });
    }

    return { user, session };
  } catch (error) {
    throw new Error('Failed to process phone verification');
  }
}
