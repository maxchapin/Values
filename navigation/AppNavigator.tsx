import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList, ROUTES } from './types';
import { useUserStore } from '../store/userStore';
import { useValuesSelectionStore } from '../store/valuesSelectionStore';

// Auth screens
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';

// Values screens
import { ValuesSelectionScreen } from '../screens/values/ValuesSelectionScreen';
import { ValuesNarrowScreen } from '../screens/values/ValuesNarrowScreen';
import { ValuesFinalScreen } from '../screens/values/ValuesFinalScreen';

// Main app screens
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { MatchesScreen } from '../screens/MatchesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// Debug screen (dev mode only)
import { DebugScreen } from '../screens/DebugScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

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
      }}
    >
      <Tab.Screen
        name={ROUTES.DISCOVER}
        component={DiscoverScreen}
        options={{
          title: 'Discover',
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name={ROUTES.MATCHES}
        component={MatchesScreen}
        options={{
          title: 'Matches',
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name={ROUTES.PROFILE}
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Root App Navigator
 * Handles conditional navigation based on onboarding state
 * Decides which stack to show: Auth → Profile Setup → Values → Main App
 */
export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isProfileComplete, isValuesComplete } = useUserStore();
  const { currentStep } = useValuesSelectionStore();

  // Determine which screen to show based on onboarding state
  const getInitialRoute = (): keyof RootStackParamList => {
    // Step 1: Not authenticated - show welcome
    if (!isAuthenticated) {
      return ROUTES.WELCOME;
    }

    // Step 2: Authenticated but profile not complete - show profile setup
    if (!isProfileComplete) {
      return ROUTES.PROFILE_SETUP;
    }

    // Step 3: Profile complete but values not selected - show values flow
    if (!isValuesComplete) {
      // Determine which values step based on current step in store
      if (currentStep === 'initial' || currentStep === 'narrow_20') {
        return ROUTES.VALUES_SELECTION;
      }
      if (currentStep === 'narrow_10') {
        return ROUTES.VALUES_NARROW_10;
      }
      if (currentStep === 'final_5') {
        return ROUTES.VALUES_FINAL_5;
      }
      // Default to initial values selection
      return ROUTES.VALUES_SELECTION;
    }

    // Step 4: Everything complete - show main app
    return ROUTES.MAIN_APP;
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
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
          component={SignUpScreen}
          options={{ title: 'Sign Up' }}
        />
        <Stack.Screen
          name={ROUTES.PROFILE_SETUP}
          component={ProfileSetupScreen}
          options={{ title: 'Profile Setup' }}
        />

        {/* Values Selection Flow Stack */}
        <Stack.Screen
          name={ROUTES.VALUES_SELECTION}
          component={ValuesSelectionScreen}
          options={{ title: 'Select Values' }}
        />
        <Stack.Screen
          name={ROUTES.VALUES_NARROW_20}
          component={ValuesNarrowScreen}
          options={{ title: 'Narrow to 20' }}
        />
        <Stack.Screen
          name={ROUTES.VALUES_NARROW_10}
          component={ValuesNarrowScreen}
          options={{ title: 'Narrow to 10' }}
        />
        <Stack.Screen
          name={ROUTES.VALUES_FINAL_5}
          component={ValuesFinalScreen}
          options={{ title: 'Select Top 5' }}
        />

        {/* Main App - Tab Navigator */}
        <Stack.Screen
          name={ROUTES.MAIN_APP}
          component={MainTabNavigator}
          options={{ headerShown: false }}
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
