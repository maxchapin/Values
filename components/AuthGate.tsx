/**
 * Auth Gate Component
 * Switches between auth stack and main app based on authentication state
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAuthUserSync } from '../hooks/useAuthUserSync';
import { useValuesCompletionSync } from '../hooks/useValuesCompletionSync';
import { AppNavigator } from '../navigation/AppNavigator';
import { theme } from '../theme';

/**
 * Auth Gate
 * - Shows loading spinner while checking auth state
 * - Shows auth screens if user is null
 * - Shows main app if user is authenticated
 * 
 * The AppNavigator already handles routing based on onboarding state,
 * so we just need to ensure user is authenticated before showing it.
 */
/**
 * Auth Gate Component
 * 
 * Responsibilities:
 * 1. Shows loading while AuthContext hydrates session from secure storage
 * 2. Syncs AuthUser ↔ UserStore bidirectionally:
 *    - AuthUser → UserStore: When user signs in (via useAuthUserSync)
 *    - UserStore → AuthUser: When onboarding completes (via useValuesCompletionSync)
 * 3. Renders AppNavigator which handles routing based on auth/onboarding state
 * 
 * Flow:
 * - No user → AppNavigator shows auth screens
 * - User + incomplete profile → Profile setup
 * - User + incomplete values → Values onboarding
 * - User + complete → Main app
 */
export const AuthGate: React.FC = () => {
  const { user, loading } = useAuth();
  
  // Sync AuthUser to UserStore when user signs in
  // This creates User in UserStore from AuthUser
  useAuthUserSync();
  
  // Sync values completion from UserStore back to AuthUser
  // This ensures AuthUser.isValuesComplete stays updated when onboarding completes
  useValuesCompletionSync();

  // Show loading screen while checking auth state
  // Prevents flashing between auth and main app during hydration
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // AppNavigator handles routing based on:
  // - authUser (from AuthContext)
  // - isProfileComplete (from UserStore)
  // - isValuesComplete (from UserStore)
  return <AppNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
