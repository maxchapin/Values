import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGate } from './components/AuthGate';
import { useUserStore } from './store/userStore';
import { useMatchesStore } from './store/matchesStore';
import { loadAllAppState, validateUserData, validateAuthState } from './services/persistence';
import type { PersistedUserData } from './utils/storage';
import { theme } from './theme';
import { User } from './types/user';
import { initProductionTelemetry } from './services/telemetry';


/**
 * Loading screen shown while rehydrating persisted data
 */
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

/**
 * Root App Component
 * 
 * Note: There are two rehydration systems:
 * 1. App.tsx rehydration (legacy) - restores UserStore from AsyncStorage
 * 2. AuthContext rehydration (new) - restores AuthUser from SecureStore
 * 
 * AuthContext is now the source of truth for authentication.
 * UserStore rehydration is kept for backward compatibility but AuthContext
 * handles session restoration independently.
 */
export default function App() {
  useEffect(() => {
    initProductionTelemetry();
  }, []);

  const [isRehydrating, setIsRehydrating] = useState<boolean>(true);
  const [rehydrationStatus, setRehydrationStatus] = useState<string>('Initializing...');
  const [rehydrationResult, setRehydrationResult] = useState<{
    autoLogin: boolean;
    reason: string;
  } | null>(null);
  const { rehydrate: rehydrateUser } = useUserStore();
  const { rehydrate: rehydrateMatches } = useMatchesStore();

  // DEV: log memory every 15s to track optimization (target 200–250MB)
  useEffect(() => {
    if (!__DEV__) return () => {};
    const { monitorMemory } = require('./services/memoryMonitor');
    return monitorMemory();
  }, []);

  useEffect(() => {
    // Only run once on mount - don't depend on store functions
    let isMounted = true;
    
    const rehydrateApp = async (): Promise<void> => {
      if (!isMounted) return;
      try {
        setRehydrationStatus('Loading persisted data...');
        
        const persistedState = await loadAllAppState();
        
        // Validate and rehydrate auth state
        if (persistedState.authState && validateAuthState(persistedState.authState)) {
          const { isAuthenticated, userId, keepSignedIn } = persistedState.authState;
          
          if (__DEV__) {
            console.log('[App] Found persisted auth state:', {
              isAuthenticated,
              userId,
              keepSignedIn,
              keepSignedInType: typeof keepSignedIn,
              hasUserData: !!persistedState.userData,
            });
            console.log('[App] Raw auth state object:', JSON.stringify(persistedState.authState, null, 2));
          }
          
          // If keepSignedIn is false, don't restore auth session (user must log in again)
          // but user data is still persisted for potential future use
          if (!keepSignedIn) {
            if (__DEV__) {
              console.log('[App] ❌ Auto-login skipped: keepSignedIn=false');
              console.log('[App] User data is still persisted but session not restored');
            }
            // Mark store as hydrated even though we're not restoring session
            // This allows the navigator to render and show the login screen
            const { useUserStore } = await import('./store/userStore');
            useUserStore.setState({ isHydrated: true });
            
            setRehydrationResult({
              autoLogin: false,
              reason: 'keepSignedIn disabled',
            });
            setRehydrationStatus('Keep signed in disabled, showing login...');
            setIsRehydrating(false);
            return;
          }
          
          // If authenticated and user data exists, rehydrate full session
          if (isAuthenticated && userId && persistedState.userData && validateUserData(persistedState.userData)) {
            const persistedUser = persistedState.userData.user;
            
            // Convert persisted user data to User type (support legacy "location" string)
            const ud = persistedUser as PersistedUserData['user'] & { location?: string };
            const user: User = {
              id: persistedUser.id,
              email: persistedUser.email,
              name: persistedUser.name,
              age: persistedUser.age,
              birthday: (persistedUser as { birthday?: string | null }).birthday ?? undefined,
              gender: persistedUser.gender as User['gender'],
              interestedIn: persistedUser.interestedIn as User['interestedIn'],
              locationCoordinates: ud.locationCoordinates ?? null,
              locationLabel: ud.locationLabel ?? ud.location ?? null,
              neighborhood: (persistedUser as { neighborhood?: string | null }).neighborhood ?? null,
              hometown: persistedUser.hometown,
              job: persistedUser.job,
              education: persistedUser.education,
              bio: persistedUser.bio,
              photos: persistedUser.photos,
              prompts: (persistedUser.prompts ?? []).map((p) => ({
                id: p.id,
                question: p.question,
                answer: p.answer,
                isCustom: typeof (p as { isCustom?: boolean }).isCustom === 'boolean' ? (p as { isCustom: boolean }).isCustom : false,
              })),
              selectedValues: persistedUser.selectedValues,
              valuesProfile: persistedUser.valuesProfile,
              settings: persistedUser.settings,
              createdAt: persistedUser.createdAt,
              updatedAt: persistedUser.updatedAt,
            };
            
            setRehydrationStatus('Restoring user session...');
            
            // Rehydrate user store FIRST - this sets isAuthenticated, isProfileComplete, etc.
            // (Stabilization) Recompute completeness from the user object to avoid relying on stale persisted flags.
            const { checkProfileComplete, checkValuesComplete } = useUserStore.getState();
            const computedProfileComplete = checkProfileComplete(user);
            const computedValuesComplete = checkValuesComplete(user);
            rehydrateUser(user, computedProfileComplete, computedValuesComplete, keepSignedIn);
            // Explicitly mark hydrated so the gate never waits on rehydrate() implementation (same as other branches).
            useUserStore.setState({ isHydrated: true });

            // Dev-only: keep in-memory mock Discover pool in sync after cold start (mock fallback path).
            if (__DEV__) {
              try {
                const { upsertMockUser } = await import('./services/mockBackend');
                upsertMockUser(user);
                console.log('[App] ✅ Upserted persisted user into mock backend:', user.id);
              } catch (error) {
                console.warn('[App] Could not upsert user into mock backend:', error);
              }
            }
            
            // Rehydrate matches store if data exists (normalize legacy radiusKm → radiusMiles)
            if (persistedState.matchesState) {
              const { likedUserIds, filters, passedSwipes } = persistedState.matchesState;
              const normalizedFilters = { ...filters };
              if (typeof normalizedFilters.radiusMiles !== 'number' && typeof (normalizedFilters as { radiusKm?: number }).radiusKm === 'number') {
                normalizedFilters.radiusMiles = Math.round((normalizedFilters as { radiusKm: number }).radiusKm / 1.609);
              }
              if (typeof normalizedFilters.radiusMiles !== 'number') {
                normalizedFilters.radiusMiles = 50;
              }
              rehydrateMatches(likedUserIds, normalizedFilters, Array.isArray(passedSwipes) ? passedSwipes : []);
            }
            
            if (__DEV__) {
              console.log('[App] ✅ Auto-login successful:', {
                userId: user.id,
                isProfileComplete: computedProfileComplete,
                isValuesComplete: computedValuesComplete,
                keepSignedIn,
                likedUserIds: persistedState.matchesState?.likedUserIds.length || 0,
              });
            }
            
            setRehydrationResult({
              autoLogin: true,
              reason: `keepSignedIn=true, userId=${user.id}, profileComplete=${computedProfileComplete}, valuesComplete=${computedValuesComplete}`,
            });
            setRehydrationStatus('Ready!');
          } else {
            if (__DEV__) {
              console.log('[App] ❌ Auto-login skipped: Missing or invalid user data');
              console.log('[App] Auth state:', { isAuthenticated, userId });
              console.log('[App] Has user data:', !!persistedState.userData);
              if (persistedState.userData && !validateUserData(persistedState.userData)) {
                console.log('[App] User data validation failed');
              }
            }
            // Mark store as hydrated so navigator can render
            const { useUserStore } = await import('./store/userStore');
            useUserStore.setState({ isHydrated: true });
            
            setRehydrationResult({
              autoLogin: false,
              reason: 'Missing or invalid user data',
            });
            setRehydrationStatus('No valid user data, starting fresh...');
          }
        } else {
          if (__DEV__) {
            console.log('[App] ❌ Auto-login skipped: No persisted auth state found');
          }
          // Mark store as hydrated so navigator can render
          const { useUserStore } = await import('./store/userStore');
          useUserStore.setState({ isHydrated: true });
          
          setRehydrationResult({
            autoLogin: false,
            reason: 'No persisted auth state',
          });
          setRehydrationStatus('No saved session, starting fresh...');
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[App] ❌ Error rehydrating app state:', error);
        }
        // Mark store as hydrated even on error so navigator can render
        const { useUserStore } = await import('./store/userStore');
        useUserStore.setState({ isHydrated: true });
        
        setRehydrationResult({
          autoLogin: false,
          reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        setRehydrationStatus('Error loading data, starting fresh...');
      } finally {
        // Rehydration complete: render navigator immediately (avoid timing races)
        if (isMounted) {
          setIsRehydrating(false);
        }
      }
    };

    rehydrateApp();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Use only local state for the gate to avoid a race between setIsRehydrating(false)
  // and the store subscription for isHydrated. We always set the store's isHydrated
  // before setting isRehydrating to false, so opening the gate on !isRehydrating is safe.
  const showMainApp = !isRehydrating;

  return (
    <>
      <StatusBar
        style={showMainApp ? 'dark' : 'auto'}
        backgroundColor={showMainApp ? theme.colors.headerBackground : undefined}
      />
      {!showMainApp ? (
        <ErrorBoundary>
          <LoadingScreen />
          {__DEV__ && (
            <View style={styles.devStatusContainer}>
              <Text style={styles.devStatusText}>{rehydrationStatus}</Text>
              {rehydrationResult && (
                <Text style={styles.devResultText}>
                  {rehydrationResult.autoLogin ? '✅' : '❌'} {rehydrationResult.reason}
                </Text>
              )}
            </View>
          )}
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <GestureHandlerRootView style={styles.flex1}>
            <SafeAreaProvider>
              <AuthProvider>
                <AuthGate />
              {__DEV__ && rehydrationResult && (
                <View style={styles.devResultContainer}>
                  <Text style={styles.devResultText}>
                    {rehydrationResult.autoLogin ? '✅ Auto-logged in' : '❌ Showing login'}
                  </Text>
                </View>
              )}
              </AuthProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </ErrorBoundary>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  devStatusContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    zIndex: 1000,
  },
  devStatusText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.sm,
    fontFamily: 'monospace',
  },
  devResultText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.xs,
    fontFamily: 'monospace',
    marginTop: theme.spacing.xs,
  },
  devResultContainer: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    zIndex: 1000,
  },
});
