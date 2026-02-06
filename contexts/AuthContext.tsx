/**
 * Auth Context
 * Provides unified authentication state and methods for Google, Apple, and Phone sign-in
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser, AuthProvider, AuthSession, PhoneAuthState } from '../types/auth';
import { AuthError } from '../types/auth';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';

const AUTH_SESSION_KEY = 'auth_session';
const AUTH_USER_KEY = 'auth_user';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  phoneAuthState: PhoneAuthState | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  startPhoneSignIn: (phoneNumber: string) => Promise<void>;
  confirmPhoneCode: (code: string) => Promise<void>;
  resendPhoneCode: () => Promise<void>;
  signOut: () => Promise<void>;
  clearPhoneAuthState: () => void;
  updateAuthUser: (updates: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Auth Provider Component
 * Manages authentication state and persists session securely
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [phoneAuthState, setPhoneAuthState] = useState<PhoneAuthState | null>(null);

  /**
   * Convert Supabase user to AuthUser format
   */
  const convertSupabaseUserToAuthUser = useCallback((supabaseUser: any): AuthUser => {
    const userMetadata = supabaseUser.user_metadata || {};
    return {
      id: supabaseUser.id,
      displayName: userMetadata.full_name || userMetadata.name || supabaseUser.email?.split('@')[0],
      firstName: userMetadata.given_name || userMetadata.first_name,
      lastName: userMetadata.family_name || userMetadata.last_name,
      email: supabaseUser.email || undefined,
      photoUrl: userMetadata.avatar_url || userMetadata.picture,
      authProvider: userMetadata.provider || 'google',
      createdAt: supabaseUser.created_at,
      updatedAt: supabaseUser.updated_at,
      isOnboardingComplete: userMetadata.isOnboardingComplete,
      isProfileComplete: userMetadata.isProfileComplete,
      isValuesComplete: userMetadata.isValuesComplete,
    };
  }, []);

  /**
   * Load persisted auth session on mount and listen for Supabase auth changes
   */
  useEffect(() => {
    let isMounted = true;

    const loadPersistedSession = async () => {
      try {
        // First, check if Supabase has an active session
        const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();

        if (supabaseSession && supabaseSession.user && isMounted) {
          // Convert Supabase session to AuthUser and AuthSession
          const authUser = convertSupabaseUserToAuthUser(supabaseSession.user);
          const authSession: AuthSession = {
            userId: authUser.id,
            authProvider: authUser.authProvider,
            token: supabaseSession.access_token,
            refreshToken: supabaseSession.refresh_token,
            expiresAt: supabaseSession.expires_at ? supabaseSession.expires_at * 1000 : undefined,
          };

          // Persist to secure storage
          await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(authSession));
          await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(authUser));
          setUser(authUser);
          // Set loading to false immediately after restoring session
          setLoading(false);

          if (__DEV__) {
            console.log('[AuthContext] ✅ Restored Supabase session:', authUser.id);
            console.log('[AuthContext] ✅ Loading set to false after session restore');
          }
        } else {
          // Fallback to legacy secure storage if no Supabase session
          const sessionJson = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
          const userJson = await SecureStore.getItemAsync(AUTH_USER_KEY);

          if (sessionJson && userJson) {
            const session: AuthSession = JSON.parse(sessionJson);
            const persistedUser: AuthUser = JSON.parse(userJson);

            // Validate session
            const isValid = await authService.validateSession(session);
            if (isValid && isMounted) {
              setUser(persistedUser);
              if (__DEV__) {
                console.log('[AuthContext] Restored session:', persistedUser.id);
              }
            } else if (isMounted) {
              // Session expired or invalid - clear storage
              await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
              await SecureStore.deleteItemAsync(AUTH_USER_KEY);
              if (__DEV__) {
                console.log('[AuthContext] Session expired, cleared storage');
              }
            }
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[AuthContext] Error loading persisted session:', error);
        }
        // Clear potentially corrupted data
        try {
          await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
          await SecureStore.deleteItemAsync(AUTH_USER_KEY);
        } catch (clearError) {
          // Ignore clear errors
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPersistedSession();

    // Listen for Supabase auth state changes (e.g., when OAuth redirect completes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (__DEV__) {
        console.log('[AuthContext] Supabase auth state changed:', event, session?.user?.id);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Convert Supabase user to AuthUser
        const authUser = convertSupabaseUserToAuthUser(session.user);
        const authSession: AuthSession = {
          userId: authUser.id,
          authProvider: authUser.authProvider,
          token: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
        };

        // Persist to secure storage
        try {
          await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(authSession));
          await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(authUser));
          setUser(authUser);
          // CRITICAL: Set loading to false immediately so navigation can happen
          setLoading(false);
          if (__DEV__) {
            console.log('[AuthContext] ✅ User signed in via Supabase:', authUser.id);
            console.log('[AuthContext] ✅ Loading set to false, navigation should happen now');
          }
        } catch (error) {
          if (__DEV__) {
            console.error('[AuthContext] Error persisting Supabase session:', error);
          }
          // Even on error, set loading to false so app doesn't hang
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // Clear user and storage
        setUser(null);
        try {
          await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
          await SecureStore.deleteItemAsync(AUTH_USER_KEY);
        } catch (error) {
          // Ignore clear errors
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [convertSupabaseUserToAuthUser]);

  /**
   * Persist auth session and user to secure storage
   * For Apple Sign-In: Merges new data with existing user data to preserve
   * name/email that are only provided on first sign-in
   */
  const persistAuth = useCallback(async (user: AuthUser, session: AuthSession) => {
    try {
      // For Apple Sign-In, preserve existing user data if new data is missing
      // (Apple only provides name/email on first sign-in)
      if (user.authProvider === 'apple') {
        try {
          const existingUserJson = await SecureStore.getItemAsync(AUTH_USER_KEY);
          if (existingUserJson) {
            const existingUser: AuthUser = JSON.parse(existingUserJson);
            // If this is the same user, merge data (preserve existing name/email)
            if (existingUser.id === user.id) {
              user = {
                ...user,
                // Preserve existing name/email if new data is missing
                displayName: user.displayName || existingUser.displayName,
                firstName: user.firstName || existingUser.firstName,
                lastName: user.lastName || existingUser.lastName,
                email: user.email || existingUser.email,
              };
              if (__DEV__) {
                console.log('[AuthContext] Merged Apple user data, preserved existing name/email');
              }
            }
          }
        } catch (mergeError) {
          // If merge fails, continue with new user data
          if (__DEV__) {
            console.warn('[AuthContext] Could not merge user data:', mergeError);
          }
        }
      }

      await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
      setUser(user);
      if (__DEV__) {
        console.log('[AuthContext] Persisted session:', user.id);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[AuthContext] Error persisting session:', error);
      }
      throw new AuthError('Failed to save authentication session', 'PERSIST_ERROR');
    }
  }, []);

  /**
   * Clear persisted auth data
   */
  const clearAuth = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
      await SecureStore.deleteItemAsync(AUTH_USER_KEY);
      setUser(null);
      setPhoneAuthState(null);
      if (__DEV__) {
        console.log('[AuthContext] Cleared auth session');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[AuthContext] Error clearing session:', error);
      }
    }
  }, []);

  /**
   * Sign in with Google
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      const { user: authUser, session } = await authService.signInWithGoogle();
      await persistAuth(authUser, session);
    } catch (error) {
      if (__DEV__) {
        console.error('[AuthContext] Google sign-in error:', error);
      }
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        error instanceof Error ? error.message : 'Failed to sign in with Google',
        'GOOGLE_SIGN_IN_ERROR',
        'google'
      );
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  /**
   * Sign in with Apple
   */
  const signInWithApple = useCallback(async () => {
    try {
      setLoading(true);
      const { user: authUser, session } = await authService.signInWithApple();
      await persistAuth(authUser, session);
    } catch (error) {
      if (__DEV__) {
        console.error('[AuthContext] Apple sign-in error:', error);
      }
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        error instanceof Error ? error.message : 'Failed to sign in with Apple',
        'APPLE_SIGN_IN_ERROR',
        'apple'
      );
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  /**
   * Start phone number sign-in (send OTP)
   */
  const startPhoneSignIn = useCallback(async (phoneNumber: string) => {
    try {
      setLoading(true);
      const phoneState = await authService.startPhoneSignIn(phoneNumber);
      setPhoneAuthState(phoneState);
    } catch (error) {
      if (__DEV__) {
        console.error('[AuthContext] Phone sign-in start error:', error);
      }
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        error instanceof Error ? error.message : 'Failed to start phone sign-in',
        'PHONE_SIGN_IN_START_ERROR',
        'phone'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Confirm phone OTP code
   */
  const confirmPhoneCode = useCallback(
    async (code: string) => {
      if (!phoneAuthState) {
        throw new AuthError('No phone verification in progress', 'NO_PHONE_AUTH_STATE', 'phone');
      }

      try {
        setLoading(true);
        const { user: authUser, session } = await authService.confirmPhoneCode(
          phoneAuthState.phoneNumber,
          code
        );
        await persistAuth(authUser, session);
        setPhoneAuthState(null); // Clear phone auth state after successful sign-in
      } catch (error) {
        if (__DEV__) {
          console.error('[AuthContext] Phone code confirmation error:', error);
        }
        if (error instanceof AuthError) {
          throw error;
        }
        throw new AuthError(
          error instanceof Error ? error.message : 'Failed to verify phone code',
          'PHONE_CODE_VERIFY_ERROR',
          'phone'
        );
      } finally {
        setLoading(false);
      }
    },
    [phoneAuthState, persistAuth]
  );

  /**
   * Sign out
   * Clears all auth data from secure storage and local state
   * Also clears Supabase session and UserStore to ensure complete logout
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      
      // Sign out from Supabase first
      try {
        await supabase.auth.signOut();
      } catch (supabaseError) {
        if (__DEV__) {
          console.warn('[AuthContext] Error signing out from Supabase:', supabaseError);
        }
      }
      
      // Clear auth data from secure storage
      await clearAuth();
      
      // Also clear UserStore (if it exists) to ensure complete logout
      try {
        const { useUserStore } = await import('../store/userStore');
        const { logout: logoutUserStore } = useUserStore.getState();
        await logoutUserStore();
      } catch (error) {
        // UserStore might not be available, that's okay
        if (__DEV__) {
          console.warn('[AuthContext] Could not clear UserStore:', error);
        }
      }
      
      if (__DEV__) {
        console.log('[AuthContext] Sign out complete - all data cleared');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[AuthContext] Sign out error:', error);
      }
      // Even if clearing fails, clear local state to ensure user is logged out
      setUser(null);
      setPhoneAuthState(null);
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  /**
   * Clear phone auth state (e.g., user cancels)
   */
  const clearPhoneAuthState = useCallback(() => {
    setPhoneAuthState(null);
  }, []);

  /**
   * Resend phone verification code
   * Useful when code expires or user didn't receive it
   */
  const resendPhoneCode = useCallback(async () => {
    if (!phoneAuthState) {
      throw new AuthError('No phone verification in progress', 'NO_PHONE_AUTH_STATE', 'phone');
    }

    try {
      setLoading(true);
      // Clear existing state and request new code
      const newPhoneState = await authService.startPhoneSignIn(phoneAuthState.phoneNumber);
      setPhoneAuthState(newPhoneState);
    } catch (error) {
      if (__DEV__) {
        console.error('[AuthContext] Resend phone code error:', error);
      }
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        error instanceof Error ? error.message : 'Failed to resend verification code',
        'RESEND_CODE_ERROR',
        'phone'
      );
    } finally {
      setLoading(false);
    }
  }, [phoneAuthState]);

  /**
   * Update AuthUser (e.g., when onboarding completes)
   * Persists updates to secure storage
   */
  const updateAuthUser = useCallback(async (updates: Partial<AuthUser>) => {
    if (!user) {
      throw new AuthError('No user to update', 'NO_USER', undefined);
    }

    try {
      const updatedUser: AuthUser = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      if (__DEV__) {
        console.log('[AuthContext] Updated user:', Object.keys(updates));
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[AuthContext] Error updating user:', error);
      }
      throw new AuthError('Failed to update user', 'UPDATE_ERROR');
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    loading,
    phoneAuthState,
    signInWithGoogle,
    signInWithApple,
    startPhoneSignIn,
    confirmPhoneCode,
    resendPhoneCode,
    signOut,
    clearPhoneAuthState,
    updateAuthUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
