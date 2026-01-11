/**
 * Navigation type definitions
 * Centralized route names and parameter types for type-safe navigation
 */

// Auth flow routes
export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  ProfileSetup: undefined;
};

// Values selection flow routes
export type ValuesStackParamList = {
  ValuesSelection: undefined;
  ValuesNarrow20: undefined;
  ValuesNarrow10: undefined;
  ValuesFinal5: undefined;
};

// Main app routes
export type MainTabParamList = {
  Discover: undefined;
  Matches: undefined;
  Profile: undefined;
};

// Root stack (combines auth, values, and main app)
export type RootStackParamList = {
  // Auth flow
  Welcome: undefined;
  SignUp: undefined;
  ProfileSetup: undefined;
  // Values flow
  ValuesSelection: undefined;
  ValuesNarrow20: undefined;
  ValuesNarrow10: undefined;
  ValuesFinal5: undefined;
  // Main app (tabs)
  MainApp: undefined;
  // Legacy (can be removed later)
  Home: undefined;
  Details: { itemId: string };
};

// Route name constants to avoid duplication
export const ROUTES = {
  // Auth
  WELCOME: 'Welcome',
  SIGN_UP: 'SignUp',
  PROFILE_SETUP: 'ProfileSetup',
  // Values
  VALUES_SELECTION: 'ValuesSelection',
  VALUES_NARROW_20: 'ValuesNarrow20',
  VALUES_NARROW_10: 'ValuesNarrow10',
  VALUES_FINAL_5: 'ValuesFinal5',
  // Main app
  MAIN_APP: 'MainApp',
  DISCOVER: 'Discover',
  MATCHES: 'Matches',
  PROFILE: 'Profile',
  // Legacy
  HOME: 'Home',
  DETAILS: 'Details',
} as const;
