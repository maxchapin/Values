/**
 * Supabase Client Initialization
 * Configured for Expo with proper redirect handling
 */

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// DEBUG: Log initialization
if (__DEV__) {
  console.log('[DEBUG] Supabase initialization:', {
    url: supabaseUrl || 'MISSING',
    key: supabaseKey ? `${supabaseKey.slice(0, 10)}...${supabaseKey.slice(-5)}` : 'MISSING',
    keyLength: supabaseKey?.length || 0,
    hasConstants: !!Constants.expoConfig,
    redirectTo: Constants.expoConfig?.extra?.supabaseRedirectTo || 'not set',
  });
}

if (!supabaseUrl || !supabaseKey) {
  const error = new Error(
    'Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
  console.error('[DEBUG] Supabase initialization failed:', error.message);
  throw error;
}

const redirectTo =
  Constants.expoConfig?.extra?.supabaseRedirectTo ||
  `${supabaseUrl}/auth/v1/callback`;

if (__DEV__) {
  console.log('[DEBUG] Supabase redirectTo:', redirectTo);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Expo automatically handles dev redirects
    // In production, this will be your Supabase project's auth callback URL
    redirectTo,
    // Enable automatic session refresh
    autoRefreshToken: true,
    // Persist session in secure storage
    persistSession: true,
    // Detect session from URL (for OAuth redirects)
    detectSessionInUrl: true,
  },
});

if (__DEV__) {
  console.log('[DEBUG] Supabase client created successfully');
  console.log('[DEBUG] Supabase client URL:', supabase.supabaseUrl);
}
