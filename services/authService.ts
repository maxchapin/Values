/**
 * Auth Service
 * Handles authentication with Google, Apple, and Phone providers
 * Uses Supabase for Google OAuth (production-ready)
 */

import { Platform, Linking } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import type { AuthUser, AuthProvider, AuthSession as AuthSessionType, PhoneAuthState } from '../types/auth';
import { AuthError } from '../types/auth';
import type { Session } from '@supabase/supabase-js';
import { verifyPhoneCode } from './backendAuthApi';
import { supabase } from './supabase';
import Constants from 'expo-constants';

// Complete web browser auth session for proper OAuth flow
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SESSION_POLL_MS = 400;
const GOOGLE_OAUTH_MAX_WAIT_MS = 120_000;
/** After browser returns, keep syncing with Supabase until session appears (memory/AsyncStorage). */
const GOOGLE_POST_BROWSER_WAIT_MS = 90_000;
/** Bound setSession / exchangeCodeForSession so a hung request cannot block sign-in forever. */
const OAUTH_NETWORK_TIMEOUT_MS = 25_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll getSession and periodically refreshSession until a user session exists or deadline.
 */
async function waitForSupabaseUserSession(maxMs: number): Promise<Session | null> {
  const deadline = Date.now() + maxMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return session;
      }
      if (attempt % 5 === 4) {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshData.session?.user) {
          return refreshData.session;
        }
      }
    } catch {
      /* ignore */
    }
    attempt += 1;
    await delay(GOOGLE_SESSION_POLL_MS);
  }
  return null;
}

function buildGoogleAuthFromSupabaseSession(session: Session): {
  user: AuthUser;
  session: AuthSessionType;
} {
  const userMetadata = session.user.user_metadata || {};
  const fullName = userMetadata.full_name || userMetadata.name || '';
  const firstName =
    userMetadata.given_name ||
    userMetadata.first_name ||
    (fullName ? fullName.trim().split(/\s+/)[0] : undefined) ||
    session.user.email?.split('@')[0];
  const lastName =
    userMetadata.family_name ||
    userMetadata.last_name ||
    (fullName ? fullName.trim().split(/\s+/).slice(1).join(' ') : undefined);
  const authUser: AuthUser = {
    id: session.user.id,
    displayName: fullName || session.user.email?.split('@')[0],
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: session.user.email || undefined,
    photoUrl: userMetadata.avatar_url || userMetadata.picture,
    authProvider: 'google',
    createdAt: session.user.created_at,
    updatedAt: session.user.updated_at,
    isOnboardingComplete: userMetadata.isOnboardingComplete,
    isProfileComplete: userMetadata.isProfileComplete,
    isValuesComplete: userMetadata.isValuesComplete,
  };
  const authSession: AuthSessionType = {
    userId: authUser.id,
    authProvider: authUser.authProvider,
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
  };
  return { user: authUser, session: authSession };
}

function buildAppleAuthFromSupabaseSession(
  session: Session,
  credential: { fullName?: AppleAuthentication.AppleAuthenticationFullName | null; email?: string | null },
): { user: AuthUser; session: AuthSessionType } {
  const meta = session.user.user_metadata || {};
  const givenName = credential.fullName?.givenName || meta.given_name || undefined;
  const familyName = credential.fullName?.familyName || meta.family_name || undefined;
  const displayName =
    [givenName, familyName].filter(Boolean).join(' ') ||
    meta.full_name ||
    meta.name ||
    session.user.email?.split('@')[0];
  const authUser: AuthUser = {
    id: session.user.id,
    displayName,
    firstName: givenName,
    lastName: familyName,
    email: credential.email || session.user.email || undefined,
    photoUrl: undefined,
    authProvider: 'apple',
    createdAt: session.user.created_at,
    updatedAt: session.user.updated_at,
    isOnboardingComplete: meta.isOnboardingComplete,
    isProfileComplete: meta.isProfileComplete,
    isValuesComplete: meta.isValuesComplete,
  };
  const authSession: AuthSessionType = {
    userId: authUser.id,
    authProvider: 'apple',
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
  };
  return { user: authUser, session: authSession };
}

function buildEmailAuthFromSupabaseSession(session: Session): {
  user: AuthUser;
  session: AuthSessionType;
} {
  const userMetadata = session.user.user_metadata || {};
  const fullName = userMetadata.full_name || userMetadata.name || '';
  const firstName =
    userMetadata.given_name ||
    userMetadata.first_name ||
    (fullName ? fullName.trim().split(/\s+/)[0] : undefined) ||
    session.user.email?.split('@')[0];
  const lastName =
    userMetadata.family_name ||
    userMetadata.last_name ||
    (fullName ? fullName.trim().split(/\s+/).slice(1).join(' ') : undefined);
  const authUser: AuthUser = {
    id: session.user.id,
    displayName: fullName || session.user.email?.split('@')[0],
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: session.user.email || undefined,
    photoUrl: userMetadata.avatar_url,
    authProvider: 'email',
    createdAt: session.user.created_at,
    updatedAt: session.user.updated_at,
    isOnboardingComplete: userMetadata.isOnboardingComplete,
    isProfileComplete: userMetadata.isProfileComplete,
    isValuesComplete: userMetadata.isValuesComplete,
  };
  const authSession: AuthSessionType = {
    userId: authUser.id,
    authProvider: authUser.authProvider,
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
  };
  return { user: authUser, session: authSession };
}

/** Extract Supabase OAuth params from hash, query, or regex fallback. */
function parseOAuthParamsFromUrl(urlString: string): {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
} {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let code: string | null = null;

  const hashIndex = urlString.indexOf('#');
  if (hashIndex !== -1) {
    const hash = urlString.substring(hashIndex + 1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    refreshToken = params.get('refresh_token');
    code = params.get('code');
  }

  if (!accessToken && !code) {
    const queryIndex = urlString.indexOf('?');
    if (queryIndex !== -1) {
      const query = urlString.substring(queryIndex + 1);
      const params = new URLSearchParams(query);
      accessToken = params.get('access_token');
      refreshToken = params.get('refresh_token');
      code = params.get('code');
    }
  }

  if (!accessToken) {
    const tokenMatch = urlString.match(/[#&?]access_token=([^&]+)/);
    const refreshMatch = urlString.match(/[#&?]refresh_token=([^&]+)/);
    const codeMatch = urlString.match(/[#&?]code=([^&]+)/);
    if (tokenMatch) {
      accessToken = decodeURIComponent(tokenMatch[1]);
      refreshToken = refreshMatch ? decodeURIComponent(refreshMatch[1]) : null;
    }
    if (!code && codeMatch) {
      code = decodeURIComponent(codeMatch[1]);
    }
  }

  return { accessToken, refreshToken, code };
}

/**
 * Apply tokens or PKCE code from a redirect/deep-link URL to the Supabase client.
 * Network calls are time-bounded; on timeout we return and let waitForSupabaseUserSession recover.
 */
async function applyOAuthParamsFromUrl(redirectUrl: string): Promise<void> {
  const urlString = String(redirectUrl);
  const { accessToken, refreshToken, code } = parseOAuthParamsFromUrl(urlString);

  if (accessToken) {
    if (__DEV__) {
      console.log('[DEBUG] Setting session from redirect URL tokens...');
    }
    const setPromise = supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });
    const setResult = await Promise.race([
      setPromise.then((r) => ({ kind: 'done' as const, r })),
      delay(OAUTH_NETWORK_TIMEOUT_MS).then(() => ({ kind: 'timeout' as const })),
    ]);
    if (setResult.kind === 'timeout') {
      if (__DEV__) {
        console.warn('[DEBUG] setSession timed out; will poll for session');
      }
      return;
    }
    const { error: sessionError } = setResult.r;
    if (sessionError) {
      if (__DEV__) {
        console.error('[DEBUG] Error setting session:', sessionError.message, sessionError.name);
      }
      throw new AuthError(
        `Google sign-in failed: ${sessionError.message}`,
        'GOOGLE_SIGN_IN_ERROR',
        'google'
      );
    }
    return;
  }

  if (code) {
    if (__DEV__) {
      console.log('[DEBUG] Exchanging PKCE authorization code for session...');
    }
    const exchPromise = supabase.auth.exchangeCodeForSession(code);
    const exchResult = await Promise.race([
      exchPromise.then((r) => ({ kind: 'done' as const, r })),
      delay(OAUTH_NETWORK_TIMEOUT_MS).then(() => ({ kind: 'timeout' as const })),
    ]);
    if (exchResult.kind === 'timeout') {
      if (__DEV__) {
        console.warn('[DEBUG] exchangeCodeForSession timed out; will poll for session');
      }
      return;
    }
    const { error: exchangeError } = exchResult.r;
    if (exchangeError) {
      if (__DEV__) {
        console.error('[DEBUG] exchangeCodeForSession failed:', exchangeError.message);
      }
      throw new AuthError(
        `Google sign-in failed: ${exchangeError.message}`,
        'GOOGLE_SIGN_IN_ERROR',
        'google'
      );
    }
  }
}

type GoogleOAuthRaceOk =
  | { source: 'session_poll'; session: Session }
  | { source: 'browser'; result: WebBrowser.WebBrowserAuthSessionResult };

/**
 * openAuthSessionAsync can hang on iOS after a successful redirect while AsyncStorage
 * already holds the session. Poll getSession in parallel and dismiss the browser when found.
 */
function raceBrowserWithSupabaseSessionPoll(
  oauthUrl: string,
  redirectUri: string
): Promise<GoogleOAuthRaceOk> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (pollInterval !== null) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const ok = (value: GoogleOAuthRaceOk) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const absoluteDeadline = Date.now() + GOOGLE_OAUTH_MAX_WAIT_MS;
    const timeoutId = setTimeout(() => {
      fail(
        new AuthError(
          'Session not established after Google sign-in. Please try again.',
          'SESSION_TIMEOUT',
          'google'
        )
      );
    }, GOOGLE_OAUTH_MAX_WAIT_MS);

    const clearOAuthTimeout = () => clearTimeout(timeoutId);
    let pollAttempt = 0;

    const pollOnce = () => {
      void (async () => {
        if (settled) return;
        if (Date.now() > absoluteDeadline) return;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            clearOAuthTimeout();
            try {
              WebBrowser.dismissAuthSession();
            } catch {
              /* noop */
            }
            ok({ source: 'session_poll', session });
            return;
          }
          const a = pollAttempt;
          pollAttempt += 1;
          if (a % 5 === 4) {
            const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
            if (!refreshErr && refreshData.session?.user) {
              clearOAuthTimeout();
              try {
                WebBrowser.dismissAuthSession();
              } catch {
                /* noop */
              }
              ok({ source: 'session_poll', session: refreshData.session });
            }
          }
        } catch {
          /* ignore transient getSession errors */
        }
      })();
    };

    pollOnce();
    pollInterval = setInterval(pollOnce, GOOGLE_SESSION_POLL_MS);

    WebBrowser.openAuthSessionAsync(oauthUrl, redirectUri, {
      preferEphemeralSession: false,
    })
      .then((result) => {
        clearOAuthTimeout();
        ok({ source: 'browser', result });
      })
      .catch((browserError: unknown) => {
        clearOAuthTimeout();
        fail(
          browserError instanceof Error
            ? new AuthError(
                browserError.message || 'Failed to open browser for Google sign-in',
                'BROWSER_ERROR',
                'google'
              )
            : new AuthError('Failed to open browser for Google sign-in', 'BROWSER_ERROR', 'google')
        );
      });
  });
}

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
   * Completes when tokens/code are applied or AsyncStorage already holds a session
   * (parallel poll avoids a hung WebBrowser.openAuthSessionAsync on iOS production).
   */
  async signInWithGoogle(): Promise<{ user: AuthUser; session: AuthSessionType }> {
    try {
      if (__DEV__) {
        console.log('[DEBUG] ===== Google Sign-In Debug Start =====');
        console.log('[DEBUG] Supabase client exists:', !!supabase);
        console.log(
          '[DEBUG] Supabase client URL:',
          supabase ? (supabase as unknown as { supabaseUrl?: string }).supabaseUrl : 'N/A'
        );
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        console.log('[DEBUG] Environment config:', {
          url: supabaseUrl || 'MISSING',
          key: supabaseKey ? `${supabaseKey.slice(0, 10)}...${supabaseKey.slice(-5)}` : 'MISSING',
          keyLength: supabaseKey?.length || 0,
        });
      }

      // Generate redirect URI using expo-auth-session (recommended for Expo)
      const scheme = Constants.expoConfig?.scheme ?? 'values';
      const normalizedScheme = Array.isArray(scheme) ? scheme[0] : scheme;
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: normalizedScheme,
        path: 'auth/callback',
      });

      if (__DEV__) {
        console.log('[DEBUG] App redirect configuration:', { scheme: normalizedScheme, redirectUri });
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          console.log('[DEBUG] Supabase getSession test:', {
            hasSession: !!sessionData?.session,
            error: sessionError?.message || null,
          });
        } catch (testError) {
          console.error('[DEBUG] Supabase connection test failed:', testError);
        }
        console.log('[DEBUG] Calling signInWithOAuth...');
      }

      let oauthData: any = null;
      let oauthError: any = null;

      try {
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
        if (__DEV__) {
          console.log('[DEBUG] OAuth response received:', {
            hasData: !!oauthData,
            hasUrl: !!oauthData?.url,
            url: oauthData?.url ? oauthData.url.substring(0, 100) + '...' : null,
            error: oauthError ? { message: oauthError.message, status: oauthError.status, name: oauthError.name } : null,
          });
        }
      } catch (oauthException) {
        if (__DEV__) console.error('[DEBUG] OAuth exception caught:', oauthException);
        if (__DEV__ && oauthException instanceof Error) {
          console.error('[DEBUG] Exception details:', oauthException.name, oauthException.message);
        }
        throw oauthException;
      }

      if (oauthError) {
        if (__DEV__) {
          console.error('[DEBUG] OAuth error detected:', oauthError.message, oauthError.status);
        }
        
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
        if (__DEV__) console.error('[DEBUG] No URL in OAuth response - webview will not open');
        throw new AuthError(
          'OAuth flow did not return a URL. Check Supabase Google provider configuration.',
          'OAUTH_NO_URL',
          'google'
        );
      }

      if (__DEV__) console.log('[DEBUG] OAuth URL received:', oauthData.url);
      
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

      let deepLinkUrl: string | null = null;
      const linkingSubscription = Linking.addEventListener('url', (event) => {
        if (__DEV__) {
          console.log('[DEBUG] Deep link received:', event.url);
        }
        if (event.url.includes('access_token') || event.url.includes('code=')) {
          deepLinkUrl = event.url;
        }
      });

      try {
        const raceOutcome = await raceBrowserWithSupabaseSessionPoll(oauthData.url, redirectUri);

        if (raceOutcome.source === 'session_poll') {
          if (__DEV__) {
            console.log('[DEBUG] Session detected via poll (browser may have hung); returning user');
          }
          return buildGoogleAuthFromSupabaseSession(raceOutcome.session);
        }

        const browserResult = raceOutcome.result;
        const browserSuccessUrl = browserResult.type === 'success' ? browserResult.url : null;
        if (__DEV__) {
          console.log('[DEBUG] Browser result:', {
            type: browserResult.type,
            url: browserSuccessUrl ? browserSuccessUrl.substring(0, 100) + '...' : null,
          });
        }

        if (
          browserResult.type === WebBrowser.WebBrowserResultType.CANCEL ||
          browserResult.type === WebBrowser.WebBrowserResultType.DISMISS
        ) {
          throw new AuthError('Sign in cancelled by user', 'USER_CANCELLED', 'google');
        }

        const redirectUrl = browserSuccessUrl ?? deepLinkUrl;

        if (__DEV__) {
          console.log('[DEBUG] Using redirect URL for token/code:', {
            fromBrowserResult: !!browserSuccessUrl,
            fromDeepLink: !browserSuccessUrl && !!deepLinkUrl,
            url: redirectUrl ? redirectUrl.substring(0, 200) : null,
          });
        }

        if (redirectUrl) {
          if (__DEV__) {
            const { accessToken, code } = parseOAuthParamsFromUrl(String(redirectUrl));
            console.log('[DEBUG] Redirect shape:', {
              hasAccessToken: !!accessToken,
              hasPkceCode: !!code,
            });
          }
          try {
            await applyOAuthParamsFromUrl(redirectUrl);
          } catch (urlError) {
            if (urlError instanceof AuthError) {
              throw urlError;
            }
            if (__DEV__) {
              console.error('[DEBUG] Error applying OAuth redirect URL:', urlError);
            }
          }
        }

        const waitedSession = await waitForSupabaseUserSession(GOOGLE_POST_BROWSER_WAIT_MS);
        if (waitedSession?.user) {
          if (__DEV__) {
            console.log('[DEBUG] Returning user and session after post-browser wait');
          }
          return buildGoogleAuthFromSupabaseSession(waitedSession);
        }

        throw new AuthError(
          'Session not established after Google sign-in. Please try again.',
          'SESSION_TIMEOUT',
          'google'
        );
      } finally {
        linkingSubscription.remove();
      }
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
   * Sign in with Apple using native Apple Authentication + Supabase signInWithIdToken.
   *
   * Flow:
   * 1. Generate a random nonce; pass its SHA-256 hash to Apple to prevent replay attacks.
   * 2. Apple returns an identity token (JWT) bound to that nonce.
   * 3. Supabase validates the token server-side and creates/returns a session.
   *
   * Note: Apple only provides fullName and email on the VERY FIRST sign-in per app install.
   */
  async signInWithApple(): Promise<{ user: AuthUser; session: AuthSessionType }> {
    if (Platform.OS !== 'ios') {
      throw new AuthError('Apple Sign In is only available on iOS', 'APPLE_IOS_ONLY', 'apple');
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new AuthError(
        'Apple Sign In is not available on this device',
        'APPLE_NOT_AVAILABLE',
        'apple'
      );
    }

    try {
      if (__DEV__) console.log('[authService] Starting Apple Sign In...');

      // Generate nonce — raw value sent to Supabase, hashed value sent to Apple
      const rawNonce = Math.random().toString(36).substring(2, 15) +
                       Math.random().toString(36).substring(2, 15);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new AuthError('Apple did not return an identity token', 'USER_CANCELLED', 'apple');
      }

      if (__DEV__) {
        console.log('[authService] Apple credential received:', {
          hasFullName: !!credential.fullName,
          hasEmail: !!credential.email,
        });
      }

      // Exchange with Supabase — server-side token validation, no client-side JWT decoding
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error || !data.session) {
        throw new AuthError(
          error?.message || 'Supabase did not return a session',
          'APPLE_SIGN_IN_ERROR',
          'apple',
        );
      }

      if (__DEV__) console.log('[authService] Apple sign-in complete:', data.session.user.id);

      return buildAppleAuthFromSupabaseSession(data.session, {
        fullName: credential.fullName,
        email: credential.email,
      });
    } catch (error: unknown) {
      if (error instanceof AuthError) throw error;

      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code?: string }).code;
        if (code === 'ERR_REQUEST_CANCELED') {
          throw new AuthError('Sign in cancelled by user', 'USER_CANCELLED', 'apple');
        }
        const message =
          'message' in error && typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : 'Failed to sign in with Apple';
        throw new AuthError(`Apple Sign In failed: ${message}`, 'APPLE_SIGN_IN_ERROR', 'apple');
      }

      if (error instanceof Error) {
        throw new AuthError(error.message || 'Failed to sign in with Apple', 'APPLE_SIGN_IN_ERROR', 'apple');
      }

      throw new AuthError('An unexpected error occurred during Apple sign-in', 'UNKNOWN_ERROR', 'apple');
    }
  },

  /**
   * Sign in with a pre-provisioned email/password account via Supabase Auth.
   * There is no self-serve sign-up UI for this — it only works for accounts created
   * out-of-band (e.g. the Apple App Review demo account), so it's safe to leave enabled.
   */
  async signInWithEmailPassword(email: string, password: string): Promise<{ user: AuthUser; session: AuthSessionType }> {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      throw new AuthError('Enter an email and password', 'INVALID_CREDENTIALS', 'email');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error || !data.session) {
      throw new AuthError(
        error?.message || 'Supabase did not return a session',
        'EMAIL_SIGN_IN_ERROR',
        'email',
      );
    }

    if (__DEV__) console.log('[authService] Email sign-in complete:', data.session.user.id);

    return buildEmailAuthFromSupabaseSession(data.session);
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
   * Checks the locally-cached expiry on the legacy SecureStore session
   * fallback (contexts/AuthContext.tsx loadPersistedSession). This is only
   * consulted when there's no active Supabase session to restore — real
   * session refresh for the OAuth flow is handled entirely by the Supabase
   * client's own autoRefreshToken (lib/supabase.ts) and never goes through
   * here. There's no separate backend to refresh against, so an expired
   * legacy session simply forces re-login rather than attempting a refresh.
   */
  async validateSession(session: AuthSessionType): Promise<boolean> {
    if (!session.expiresAt) {
      return true; // No expiration recorded - treat as still valid
    }
    return session.expiresAt - Date.now() > 0;
  },
};
