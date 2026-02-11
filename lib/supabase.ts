/**
 * Single global Supabase client with AsyncStorage for reliable session persistence.
 * Import this client everywhere (AuthContext, authService, supabaseProfile, EditProfile).
 * Do not create a second client.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  const error = new Error(
    'Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
  console.error('[lib/supabase] Initialization failed:', error.message);
  throw error;
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

if (__DEV__) {
  console.log('[lib/supabase] Single client created with AsyncStorage');
}

// Keep session fresh when app comes to foreground (React Native)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
