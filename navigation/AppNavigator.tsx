import React, { useEffect, useMemo, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList, ROUTES } from './types';
import { useAuth } from '../contexts/AuthContext';
import { useUserStore } from '../store/userStore';
import { useValuesOnboardingStore } from '../store/valuesOnboardingStore';
import { theme } from '../theme';

// Auth screens
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';

// Values screens
import { ValuesOnboardingScreen } from '../screens/values/ValuesOnboardingScreen';
// DEPRECATED: Old values screens - kept only for emergency fallback/debugging
// These should not be used in normal onboarding flow
import { ValuesSelectionScreen } from '../screens/values/ValuesSelectionScreen';
import { ValuesNarrowScreen } from '../screens/values/ValuesNarrowScreen';
import { ValuesFinalScreen } from '../screens/values/ValuesFinalScreen';

// Main app screens (default import so navigator always receives a function component)
import DiscoverScreen from '../screens/DiscoverScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { ProfilePreviewScreen } from '../screens/ProfilePreviewScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';

// Debug screen (dev mode only)
import { DebugScreen } from '../screens/DebugScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Main Tab Navigator
 * Contains Discover, Matches, and Profile tabs
 */
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name={ROUTES.DISCOVER}
        component={DiscoverScreen}
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.MATCHES}
        component={MatchesScreen}
        options={{
          title: 'Matches',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.PROFILE}
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size ?? 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Root App Navigator
 * Handles conditional navigation based on authentication and onboarding state
 *
 * Navigation uses Supabase profile as source of truth so returning users
 * (with onboarding_completed in DB) go straight to main app.
 *
 * Phases:
 * 1. 'auth' - No authenticated user → Welcome/Login
 * 2. 'profile' - User authenticated but profile incomplete → ProfileSetupScreen
 * 3. 'values' - Profile complete but values incomplete → ValuesOnboardingScreen
 * 4. 'main' - Profile has is_onboarding_complete → MainTabNavigator
 */
export const AppNavigator: React.FC = () => {
  const { user: authUser, profile } = useAuth();

  // Prefer Supabase profile for routing so logout → login respects onboarding_completed
  const isProfileComplete = profile?.is_profile_complete ?? useUserStore((state) => state.isProfileComplete);
  const isValuesComplete = profile?.is_values_complete ?? useUserStore((state) => state.isValuesComplete);
  const isOnboardingComplete = profile?.is_onboarding_complete ?? (isProfileComplete && isValuesComplete);

  const phase = useMemo<'auth' | 'profile' | 'values' | 'main'>(() => {
    if (!authUser) return 'auth';
    if (isOnboardingComplete) return 'main';
    if (!isProfileComplete) return 'profile';
    if (!isValuesComplete) return 'values';
    return 'main';
  }, [authUser, isOnboardingComplete, isProfileComplete, isValuesComplete]);

  const phaseRootRoute = useMemo<keyof RootStackParamList>(() => {
    switch (phase) {
      case 'auth':
        return ROUTES.WELCOME;
      case 'profile':
        return ROUTES.PROFILE_SETUP;
      case 'values':
        // Use new unified ValuesOnboarding screen
        return ROUTES.VALUES_ONBOARDING;
      case 'main':
      default:
        return ROUTES.MAIN_APP;
    }
  }, [phase]);

  const previousPhaseRef = useRef<typeof phase | null>(null);

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    const previousPhase = previousPhaseRef.current;
    if (previousPhase === phase) return;

    previousPhaseRef.current = phase;

    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (currentRoute === phaseRootRoute) return;

    if (__DEV__) {
      console.log('[AppNavigator] Resetting root due to phase change:', {
        from: previousPhase,
        to: phase,
        currentRoute,
        targetRoute: phaseRootRoute,
      });
    }

    navigationRef.resetRoot({
      index: 0,
      routes: [{ name: phaseRootRoute }],
    });
  }, [phase, phaseRootRoute]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={ROUTES.WELCOME}
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.headerBackground,
          },
          headerTintColor: theme.colors.headerTint,
          headerTitleStyle: {
            fontWeight: theme.typography.fontWeight.semibold,
            fontSize: theme.typography.fontSize.lg,
          },
        }}
      >
        {/* Auth Flow Stack */}
        <Stack.Screen
          name={ROUTES.WELCOME}
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={ROUTES.SIGN_UP}
          component={LoginScreen}
          options={{ title: 'Sign In' }}
        />
        <Stack.Screen
          name={ROUTES.PROFILE_SETUP}
          component={ProfileSetupScreen}
          options={{ title: 'Profile Setup' }}
        />

        {/* Values Onboarding Flow - New Tiered Values Cloud */}
        <Stack.Screen
          name={ROUTES.VALUES_ONBOARDING}
          component={ValuesOnboardingScreen}
          options={{ headerShown: false }}
        />
        
        {/* DEPRECATED: Old values screens - kept only for emergency fallback/debugging
            These should not be used in normal onboarding flow.
            TODO: Remove these screens and routes after confirming new flow works in production.
        */}
        {__DEV__ && (
          <>
            <Stack.Screen
              name={ROUTES.VALUES_SELECTION}
              component={ValuesSelectionScreen}
              options={{ title: 'Select Values (DEPRECATED)' }}
            />
            <Stack.Screen
              name={ROUTES.VALUES_NARROW_20}
              component={ValuesNarrowScreen}
              options={{ title: 'Narrow to 20 (DEPRECATED)' }}
            />
            <Stack.Screen
              name={ROUTES.VALUES_NARROW_10}
              component={ValuesNarrowScreen}
              options={{ title: 'Narrow to 10 (DEPRECATED)' }}
            />
            <Stack.Screen
              name={ROUTES.VALUES_FINAL_5}
              component={ValuesFinalScreen}
              options={{ title: 'Select Top 5 (DEPRECATED)' }}
            />
          </>
        )}

        {/* Main App - Tab Navigator */}
        <Stack.Screen
          name={ROUTES.MAIN_APP}
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />

        {/* Profile Editing */}
        <Stack.Screen
          name={ROUTES.EDIT_PROFILE}
          component={EditProfileScreen}
          options={{
            title: 'Edit Profile',
            headerBackTitle: 'Profile',
            headerBackButtonMenuEnabled: false,
          }}
        />
        <Stack.Screen
          name={ROUTES.PROFILE_PREVIEW}
          component={ProfilePreviewScreen}
          options={{ title: 'Profile Preview', headerShown: false }}
        />
        <Stack.Screen
          name={ROUTES.SETTINGS}
          component={SettingsScreen}
          options={{
            title: 'Settings & Help',
            headerBackTitle: 'Profile',
            headerBackTitleStyle: {
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
            },
            headerTintColor: theme.colors.primary,
          }}
        />
        <Stack.Screen
          name={ROUTES.MATCH_DETAIL}
          component={MatchDetailScreen}
          options={{ title: 'Match', headerShown: false }}
        />

        {/* Debug Screen (dev mode only) */}
        {__DEV__ && (
          <Stack.Screen
            name={ROUTES.DEBUG}
            component={DebugScreen}
            options={{
              title: 'Debug Panel',
              presentation: 'modal',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
