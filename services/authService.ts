/**
 * Auth Service
 * Handles authentication with Google, Apple, and Phone providers
 * Uses Supabase for Google OAuth (production-ready)
 */

import { Platform, Linking } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import type { AuthUser, AuthProvider, AuthSession as AuthSessionType, PhoneAuthState } from '../types/auth';
import { AuthError } from '../types/auth';
import { loginWithApple, verifyPhoneCode } from './backendAuthApi';
import { supabase } from './supabase';
import Constants from 'expo-constants';

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
   * Sign in with Google using Supabase OAuth
   * Supabase handles the OAuth flow and redirects automatically for Expo
   * 
   * Flow:
   * 1. Supabase opens webview for Google sign-in
   * 2. User signs in → Supabase proxy → back to Expo app
   * 3. Supabase session is created automatically via onAuthStateChange
   * 4. AuthContext converts Supabase user to AuthUser format
   * 
   * Note: This function initiates the OAuth flow. The actual session creation
   * happens asynchronously via the onAuthStateChange listener in AuthContext.
   * We wait for the session to be established by polling or using a promise.
   */
  async signInWithGoogle(): Promise<{ user: AuthUser; session: AuthSessionType }> {
    try {
      // DEBUG: Comprehensive logging
      console.log('[DEBUG] ===== Google Sign-In Debug Start =====');
      console.log('[DEBUG] Supabase client exists:', !!supabase);
      console.log('[DEBUG] Supabase client URL:', supabase ? supabase.supabaseUrl : 'N/A');
      
      // Check environment variables (masked for security)
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      console.log('[DEBUG] Environment config:', {
        url: supabaseUrl || 'MISSING',
        key: supabaseKey ? `${supabaseKey.slice(0, 10)}...${supabaseKey.slice(-5)}` : 'MISSING',
        keyLength: supabaseKey?.length || 0,
      });

      // Generate redirect URI using expo-auth-session (recommended for Expo)
      // This ensures the redirect URL is properly formatted for Expo deep linking
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: Constants.expoConfig?.scheme || 'values',
        path: 'auth/callback',
      });
      
      console.log('[DEBUG] App redirect configuration:', {
        scheme: Constants.expoConfig?.scheme || 'values',
        redirectUri,
        generatedBy: 'makeRedirectUri',
      });

      // Test Supabase connection first
      console.log('[DEBUG] Testing Supabase connection...');
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('[DEBUG] Supabase getSession test:', {
          hasSession: !!sessionData.session,
          error: sessionError?.message || null,
        });
      } catch (testError) {
        console.error('[DEBUG] Supabase connection test failed:', testError);
      }

      // Initiate OAuth flow - this opens the webview
      console.log('[DEBUG] Calling signInWithOAuth...');
      let oauthData: any = null;
      let oauthError: any = null;
      
      try {
        console.log('[DEBUG] OAuth options:', {
          provider: 'google',
          redirectTo: redirectUri,
        });

        const result = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            // Use expo-auth-session's makeRedirectUri for proper Expo deep linking
            // This redirect URI must be added to Supabase Dashboard → Authentication → URL Configuration
            redirectTo: redirectUri,
          },
        });
        oauthData = result.data;
        oauthError = result.error;
        console.log('[DEBUG] OAuth response received:', {
          hasData: !!oauthData,
          hasUrl: !!oauthData?.url,
          url: oauthData?.url ? oauthData.url.substring(0, 100) + '...' : null,
          error: oauthError ? {
            message: oauthError.message,
            status: oauthError.status,
            name: oauthError.name,
          } : null,
        });
      } catch (oauthException) {
        console.error('[DEBUG] OAuth exception caught:', oauthException);
        if (oauthException instanceof Error) {
          console.error('[DEBUG] Exception details:', {
            name: oauthException.name,
            message: oauthException.message,
            stack: oauthException.stack?.split('\n').slice(0, 5).join('\n'),
          });
        }
        throw oauthException;
      }

      if (oauthError) {
        console.error('[DEBUG] OAuth error detected:', {
          message: oauthError.message,
          status: oauthError.status,
          name: oauthError.name,
        });
        
        // Handle cancellation (user closed the webview)
        if (oauthError.message?.includes('cancel') || oauthError.message?.includes('dismiss')) {
          throw new AuthError('Sign in cancelled by user', 'USER_CANCELLED', 'google');
        }
        throw new AuthError(
          `Google sign-in failed: ${oauthError.message}`,
          'GOOGLE_SIGN_IN_ERROR',
          'google'
        );
      }

      // Check if we got a URL (means webview should open)
      if (!oauthData?.url) {
        console.error('[DEBUG] No URL in OAuth response - webview will not open');
        throw new AuthError(
          'OAuth flow did not return a URL. Check Supabase Google provider configuration.',
          'OAUTH_NO_URL',
          'google'
        );
      }

      console.log('[DEBUG] OAuth URL received:', oauthData.url);
      
      // In Expo, we need to manually open the OAuth URL
      // Supabase doesn't automatically open the browser like it does on web
      console.log('[DEBUG] Opening OAuth URL in browser...');
      
      // Use the same redirect URL we passed to Supabase
      // This ensures the browser redirects back to our app
      console.log('[DEBUG] Redirect configuration for browser:', {
        redirectUrl: redirectUri,
      });

      console.log('[DEBUG] Opening browser with OAuth URL...');
      console.log('[DEBUG] OAuth URL (first 150 chars):', oauthData.url.substring(0, 150));

      // Set up a deep link listener as fallback in case WebBrowser doesn't catch the redirect
      // This handles cases where Supabase redirects to localhost or other URLs
      let deepLinkUrl: string | null = null;
      const linkingSubscription = Linking.addEventListener('url', (event) => {
        console.log('[DEBUG] Deep link received:', event.url);
        if (event.url.includes('access_token') || event.url.includes('code=')) {
          deepLinkUrl = event.url;
        }
      });

      // Open the OAuth URL in browser
      // WebBrowser will handle the redirect back to the app
      // The redirectUrl should match what we passed to Supabase OAuth
      let browserResult: WebBrowser.WebBrowserAuthSessionResult;
      try {
        browserResult = await WebBrowser.openAuthSessionAsync(
          oauthData.url,
          redirectUri, // This is where Supabase will redirect after OAuth
          {
            preferEphemeralSession: false,
          }
        );
      } catch (browserError) {
        console.error('[DEBUG] Error opening browser:', browserError);
        linkingSubscription.remove();
        throw new AuthError(
          'Failed to open browser for Google sign-in',
          'BROWSER_ERROR',
          'google'
        );
      }

      console.log('[DEBUG] Browser result:', {
        type: browserResult.type,
        url: browserResult.type === 'success' ? browserResult.url?.substring(0, 100) + '...' : null,
      });

      // Remove the deep link listener
      linkingSubscription.remove();

      // Handle browser cancellation
      if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
        throw new AuthError('Sign in cancelled by user', 'USER_CANCELLED', 'google');
      }

      // Determine which URL to use for token extraction
      // Prefer browserResult.url, but fall back to deepLinkUrl if browserResult doesn't have tokens
      const redirectUrl = browserResult.type === 'success' && browserResult.url 
        ? browserResult.url 
        : deepLinkUrl;

      console.log('[DEBUG] Using redirect URL for token extraction:', {
        fromBrowserResult: browserResult.type === 'success' && !!browserResult.url,
        fromDeepLink: !!deepLinkUrl,
        url: redirectUrl ? redirectUrl.substring(0, 200) : null,
      });

      // If we got a URL back (from browser or deep link), try to extract session from it
      if (redirectUrl) {
        console.log('[DEBUG] ===== Browser Redirect Received =====');
        console.log('[DEBUG] Full redirect URL:', redirectUrl);
        console.log('[DEBUG] Expected redirect URI:', redirectUri);
        console.log('[DEBUG] URL matches expected:', redirectUrl.startsWith(redirectUri) || redirectUrl.includes('access_token') || redirectUrl.includes('code='));
        
        // Try to extract tokens from the redirect URL
        // Supabase redirects with tokens in the URL fragment: #access_token=...&refresh_token=...
        // OR in query params: ?access_token=...&refresh_token=...
        // OR with an authorization code: ?code=... (which we'll exchange for tokens)
        try {
          const urlString = redirectUrl;
          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          
          // Check for hash fragment first (most common)
          const hashIndex = urlString.indexOf('#');
          if (hashIndex !== -1) {
            const hash = urlString.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            accessToken = params.get('access_token');
            refreshToken = params.get('refresh_token');
            console.log('[DEBUG] Found tokens in URL hash fragment');
          }
          
          // If no hash, check query params
          if (!accessToken) {
            const queryIndex = urlString.indexOf('?');
            if (queryIndex !== -1) {
              const query = urlString.substring(queryIndex + 1);
              const params = new URLSearchParams(query);
              accessToken = params.get('access_token');
              refreshToken = params.get('refresh_token');
              console.log('[DEBUG] Found tokens in URL query params');
            }
          }
          
          // Try regex as fallback (handles malformed URLs)
          if (!accessToken) {
            const tokenMatch = urlString.match(/[#&?]access_token=([^&]+)/);
            const refreshMatch = urlString.match(/[#&?]refresh_token=([^&]+)/);
            if (tokenMatch) {
              accessToken = decodeURIComponent(tokenMatch[1]);
              refreshToken = refreshMatch ? decodeURIComponent(refreshMatch[1]) : null;
              console.log('[DEBUG] Found tokens using regex fallback');
            }
          }
          
          console.log('[DEBUG] Token extraction result:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenLength: accessToken?.length || 0,
          });
          
          if (accessToken) {
            console.log('[DEBUG] Setting session from redirect URL tokens...');
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (sessionError) {
              console.error('[DEBUG] Error setting session:', {
                message: sessionError.message,
                status: sessionError.status,
                name: sessionError.name,
              });
            } else if (session) {
              console.log('[DEBUG] ✅ Session set successfully from redirect URL');
              console.log('[DEBUG] Session user ID:', session.user?.id);
            } else {
              console.log('[DEBUG] ⚠️ No session returned from setSession, but no error');
            }
          } else {
            console.log('[DEBUG] ⚠️ No access token found in redirect URL');
            console.log('[DEBUG] URL structure:', {
              hasHash: urlString.includes('#'),
              hasQuery: urlString.includes('?'),
              urlLength: urlString.length,
            });
          }
        } catch (urlError) {
          console.error('[DEBUG] ❌ Error parsing redirect URL:', urlError);
          if (urlError instanceof Error) {
            console.error('[DEBUG] Error details:', {
              name: urlError.name,
              message: urlError.message,
              stack: urlError.stack?.split('\n').slice(0, 5).join('\n'),
            });
          }
        }
        console.log('[DEBUG] ========================================');
      } else {
        console.log('[DEBUG] ⚠️ Browser result type:', browserResult.type);
        if (browserResult.type === 'cancel') {
          console.log('[DEBUG] User cancelled the OAuth flow');
        } else if (browserResult.type === 'dismiss') {
          console.log('[DEBUG] OAuth flow was dismissed');
        } else {
          console.log('[DEBUG] ⚠️ Browser result type is not success, but checking for deep link...');
          // Even if browser result isn't success, check if we got a deep link
          if (deepLinkUrl) {
            console.log('[DEBUG] Found deep link URL despite browser result failure, attempting token extraction...');
            // Try to extract tokens from deep link
            try {
              const urlString = deepLinkUrl;
              const hashIndex = urlString.indexOf('#');
              let accessToken: string | null = null;
              let refreshToken: string | null = null;
              
              if (hashIndex !== -1) {
                const hash = urlString.substring(hashIndex + 1);
                const params = new URLSearchParams(hash);
                accessToken = params.get('access_token');
                refreshToken = params.get('refresh_token');
              }
              
              if (accessToken) {
                console.log('[DEBUG] Found tokens in deep link, setting session...');
                const { data: { session }, error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken || '',
                });
                
                if (!sessionError && session) {
                  console.log('[DEBUG] ✅ Session set from deep link');
                }
              }
            } catch (deepLinkError) {
              console.error('[DEBUG] Error processing deep link:', deepLinkError);
            }
          }
        }
      }

      console.log('[DEBUG] Checking for immediate session after redirect...');

      // Try to get session immediately (might already be set from redirect URL handling above)
      const { data: { session: immediateSession }, error: immediateError } = await supabase.auth.getSession();
      
      if (immediateSession && immediateSession.user) {
        console.log('[DEBUG] ✅ Found immediate session, resolving without waiting...');
        
        // Convert Supabase user to AuthUser
        const userMetadata = immediateSession.user.user_metadata || {};
        const authUser: AuthUser = {
          id: immediateSession.user.id,
          displayName: userMetadata.full_name || userMetadata.name || immediateSession.user.email?.split('@')[0],
          firstName: userMetadata.given_name || userMetadata.first_name,
          lastName: userMetadata.family_name || userMetadata.last_name,
          email: immediateSession.user.email || undefined,
          photoUrl: userMetadata.avatar_url || userMetadata.picture,
          authProvider: 'google',
          createdAt: immediateSession.user.created_at,
          updatedAt: immediateSession.user.updated_at,
          isOnboardingComplete: userMetadata.isOnboardingComplete,
          isProfileComplete: userMetadata.isProfileComplete,
          isValuesComplete: userMetadata.isValuesComplete,
        };

        // Create AuthSession
        const authSession: AuthSessionType = {
          userId: authUser.id,
          authProvider: authUser.authProvider,
          token: immediateSession.access_token,
          refreshToken: immediateSession.refresh_token,
          expiresAt: immediateSession.expires_at ? immediateSession.expires_at * 1000 : undefined,
        };

        console.log('[DEBUG] ✅ Returning user and session immediately');
        return { user: authUser, session: authSession };
      }

      console.log('[DEBUG] No immediate session found, waiting for auth state change (SIGNED_IN event)...');
      console.log('[DEBUG] Immediate session check result:', {
        hasSession: !!immediateSession,
        hasUser: !!immediateSession?.user,
        error: immediateError?.message || null,
      });

      // Fallback: Wait for the session to be established after redirect
      // This handles cases where the session isn't immediately available
      return new Promise<{ user: AuthUser; session: AuthSessionType }>((resolve, reject) => {
        let subscription: { unsubscribe: () => void } | null = null;
        
        const timeout = setTimeout(() => {
          if (subscription) {
            subscription.unsubscribe();
          }
          console.error('[DEBUG] ❌ Timeout waiting for auth state change');
          reject(
            new AuthError(
              'Session not established after Google sign-in. Please try again.',
              'SESSION_TIMEOUT',
              'google'
            )
          );
        }, 10000); // Reduced to 10 seconds since we should have session by now

        // Listen for auth state changes
        console.log('[DEBUG] Setting up auth state change listener...');
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[DEBUG] ===== Auth State Change Event =====');
          console.log('[DEBUG] Event:', event);
          console.log('[DEBUG] Has session:', !!session);
          console.log('[DEBUG] Has user:', !!session?.user);
          console.log('[DEBUG] User ID:', session?.user?.id || 'N/A');
          console.log('[DEBUG] ====================================');

          if (event === 'SIGNED_IN' && session && session.user) {
            clearTimeout(timeout);
            if (authSubscription) {
              authSubscription.unsubscribe();
            }

            // Convert Supabase user to AuthUser format
            const supabaseUser = session.user;
            const userMetadata = supabaseUser.user_metadata || {};

            const authUser: AuthUser = {
              id: supabaseUser.id,
              displayName: userMetadata.full_name || userMetadata.name || supabaseUser.email?.split('@')[0],
              firstName: userMetadata.given_name || userMetadata.first_name,
              lastName: userMetadata.family_name || userMetadata.last_name,
              email: supabaseUser.email || undefined,
              photoUrl: userMetadata.avatar_url || userMetadata.picture,
              authProvider: 'google',
              createdAt: supabaseUser.created_at,
              updatedAt: supabaseUser.updated_at,
              isOnboardingComplete: userMetadata.isOnboardingComplete,
              isProfileComplete: userMetadata.isProfileComplete,
              isValuesComplete: userMetadata.isValuesComplete,
            };

            const authSession: AuthSessionType = {
              userId: authUser.id,
              authProvider: 'google',
              token: session.access_token,
              refreshToken: session.refresh_token,
              expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
            };

            if (__DEV__) {
              console.log('[authService] ✅ Google sign-in complete via Supabase:', authUser.id);
            }

            resolve({ user: authUser, session: authSession });
          } else if (event === 'SIGNED_OUT') {
            console.log('[DEBUG] SIGNED_OUT event received');
            clearTimeout(timeout);
            if (authSubscription) {
              authSubscription.unsubscribe();
            }
            reject(new AuthError('Sign in was cancelled', 'USER_CANCELLED', 'google'));
          } else {
            console.log('[DEBUG] Other auth event:', event);
          }
        });

        subscription = authSubscription;
        console.log('[DEBUG] Auth state listener set up, waiting for events...');
      });
    } catch (error) {
      console.error('[DEBUG] ===== Error in signInWithGoogle =====');
      console.error('[DEBUG] Error type:', error?.constructor?.name || typeof error);
      console.error('[DEBUG] Error message:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        console.error('[DEBUG] Error stack:', error.stack?.split('\n').slice(0, 10).join('\n'));
      }
      console.error('[DEBUG] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('[DEBUG] ======================================');

      if (error instanceof AuthError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof Error) {
        if (error.message.includes('Network') || error.message.includes('network')) {
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
