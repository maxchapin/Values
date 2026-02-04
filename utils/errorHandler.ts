/**
 * Error Handler Utilities
 * Centralized error handling for auth flows
 */

import { Alert, Platform } from 'react-native';
import { AuthError } from '../types/auth';

/**
 * Get user-friendly error message from auth error
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    // Map error codes to user-friendly messages
    switch (error.code) {
      case 'USER_CANCELLED':
        return ''; // Silent - user cancelled, no message needed
      case 'NETWORK_ERROR':
        return 'Network error. Please check your internet connection and try again.';
      case 'GOOGLE_CONFIG_ERROR':
        return 'Google Sign-In is not configured. Please contact support.';
      case 'APPLE_IOS_ONLY':
        return 'Apple Sign In is only available on iOS devices.';
      case 'APPLE_NOT_AVAILABLE':
        return 'Apple Sign In is not available on this device.';
      case 'INVALID_PHONE':
        return 'Please enter a valid phone number.';
      case 'CODE_EXPIRED':
        return 'Verification code has expired. Please request a new code.';
      case 'CODE_NOT_FOUND':
        return 'No verification code found. Please request a new code.';
      case 'INVALID_CODE':
        return 'Invalid verification code. Please try again.';
      case 'NO_PHONE_AUTH_STATE':
        return 'Please start phone sign-in first.';
      case 'RESEND_CODE_ERROR':
        return 'Failed to resend code. Please try again.';
      case 'PERSIST_ERROR':
        return 'Failed to save your session. Please try again.';
      case 'UPDATE_USER_ERROR':
        return 'Failed to update your account. Please try again.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Show error alert for auth errors
 * Handles cancellation silently (no alert)
 */
export function showAuthError(error: unknown, title: string = 'Error'): void {
  const message = getAuthErrorMessage(error);
  
  // Don't show alert for user cancellation
  if (error instanceof AuthError && error.code === 'USER_CANCELLED') {
    return;
  }

  // Don't show alert for empty messages
  if (!message) {
    return;
  }

  Alert.alert(title, message);
}

/**
 * Log error for debugging (dev mode only)
 */
export function logAuthError(context: string, error: unknown): void {
  if (__DEV__) {
    console.error(`[${context}] Auth error:`, error);
    if (error instanceof AuthError) {
      console.error(`[${context}] Error code: ${error.code}, provider: ${error.provider}`);
    }
  }
}
