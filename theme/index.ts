/**
 * Design System Theme
 * 
 * Centralized design tokens for consistent styling across the app.
 * This makes it easy to maintain and update the visual design.
 */

export const theme = {
  colors: {
    // Primary colors
    primary: '#007AFF',
    primaryDark: '#0051D5',
    primaryLight: '#5AC8FA',
    
    // Secondary colors
    secondary: '#5856D6',
    secondaryDark: '#3D3AA3',
    secondaryLight: '#AF52DE',
    
    // Neutral colors
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    backgroundTertiary: '#F9F9F9',
    surface: '#FFFFFF', // Card/surface background
    surfaceSecondary: '#F9F9F9', // Secondary surface (e.g., modals)
    
    // Text colors
    text: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textInverse: '#FFFFFF',
    
    // Border colors
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    borderDark: '#CCCCCC',
    
    // Status colors
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#007AFF',
    danger: '#FF3B30', // Alias for error, for semantic clarity
    
    // Disabled state
    disabled: '#CCCCCC',
    disabledText: '#999999',
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  typography: {
    // Font sizes
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
    
    // Font weights
    fontWeight: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    
    // Line heights
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 60,
  },
  
  borderRadius: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1, // Android
    },
    base: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2, // Android
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4, // Android
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8, // Android
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
