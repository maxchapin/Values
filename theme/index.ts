/**
 * Design System Theme
 * 
 * Centralized design tokens for consistent styling across the app.
 * This makes it easy to maintain and update the visual design.
 */

export const theme = {
  colors: {
    // Header chrome — white bar, dark text, hairline border
    headerBackground: '#FFFFFF',
    headerTint: '#14141C',
    headerTintSecondary: '#5A586A',
    headerBorder: '#E4E2EE',

    // Primary — warm violet
    primary: '#7C5CFF',
    primaryDark: '#5538D4',
    primaryLight: '#B6A4FF',

    // Secondary (kept for compatibility)
    secondary: '#5538D4',
    secondaryDark: '#3D2FAA',
    secondaryLight: '#B6A4FF',

    // Surfaces — three tones, light scheme
    background: '#FFFFFF',
    backgroundSecondary: '#F6F5FB',
    backgroundTertiary: '#EFEEF7',
    surface: '#FFFFFF',
    surfaceSecondary: '#F6F5FB',

    // Text
    text: '#14141C',
    textSecondary: '#5A586A',
    textTertiary: '#8E8C9E',
    textInverse: '#FFFFFF',

    // Borders — hairlines
    border: '#E4E2EE',
    borderLight: '#EFEEF5',
    borderDark: '#D4D2E0',

    // Status
    success: '#2BA471',
    error: '#E2455B',
    warning: '#D9892C',
    info: '#7C5CFF',
    danger: '#E2455B',

    // Disabled
    disabled: '#C8C6D6',
    disabledText: '#8E8C9E',

    // Overlay
    overlay: 'rgba(20, 16, 40, 0.55)',
  },

  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 36,
    },

    fontWeight: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },

    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.625,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
    '4xl': 96,
  },

  borderRadius: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  shadows: {
    sm: {
      shadowColor: 'rgba(20, 16, 40, 1)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    base: {
      shadowColor: 'rgba(20, 16, 40, 1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: 'rgba(20, 16, 40, 1)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 18,
      elevation: 4,
    },
    lg: {
      shadowColor: 'rgba(20, 16, 40, 1)',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.18,
      shadowRadius: 40,
      elevation: 8,
    },
  },
} as const;

// Type exports for TypeScript
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeTypography = typeof theme.typography;
export type ThemeSpacing = typeof theme.spacing;
export type ThemeBorderRadius = typeof theme.borderRadius;
export type ThemeShadows = typeof theme.shadows;
