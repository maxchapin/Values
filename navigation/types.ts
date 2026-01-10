/**
 * Navigation type definitions
 * Centralized route names and parameter types for type-safe navigation
 */

export type RootStackParamList = {
  Home: undefined;
  Details: { itemId: string };
};

export type TabParamList = {
  HomeTab: undefined;
  SettingsTab: undefined;
};

// Route name constants to avoid duplication
export const ROUTES = {
  HOME: 'Home',
  DETAILS: 'Details',
  HOME_TAB: 'HomeTab',
  SETTINGS_TAB: 'SettingsTab',
} as const;
