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

// Values onboarding route types
export type ValuesStackParamList = {
  ValuesOnboarding: undefined;
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
  ValuesOnboarding: { fromEditProfile?: boolean; fromProfileCard?: boolean } | undefined;
  // Main app (tabs)
  MainApp: undefined;
  // Profile editing
  EditProfile: undefined;
  ProfilePreview: undefined;
  Settings: undefined;
  // Debug (dev mode only)
  Debug: undefined;
  // Match detail (Profile + Chat)
  MatchDetail: { matchUserId: string };
  // Check-in flow
  QRScanner: undefined;
  CheckinConfirmation: { qrToken: string };
};

// Route name constants to avoid duplication
export const ROUTES = {
  // Auth
  WELCOME: 'Welcome',
  SIGN_UP: 'SignUp',
  PHONE_SIGN_IN: 'PhoneSignIn',
  PHONE_CODE: 'PhoneCode',
  PROFILE_SETUP: 'ProfileSetup',
  // Values
  VALUES_ONBOARDING: 'ValuesOnboarding',
  // Main app
  MAIN_APP: 'MainApp',
  DISCOVER: 'Discover',
  MATCHES: 'Matches',
  PROFILE: 'Profile',
  // Profile editing
  EDIT_PROFILE: 'EditProfile',
  PROFILE_PREVIEW: 'ProfilePreview',
  SETTINGS: 'Settings',
  // Match detail
  MATCH_DETAIL: 'MatchDetail',
  // Check-in flow
  QR_SCANNER: 'QRScanner',
  CHECKIN_CONFIRMATION: 'CheckinConfirmation',
  // Debug
  DEBUG: 'Debug',
} as const;
