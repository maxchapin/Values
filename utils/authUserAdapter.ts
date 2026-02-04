/**
 * Auth User Adapter
 * Converts AuthUser (minimal auth data) to/from User (full profile data)
 * Bridges the gap between authentication layer and user profile layer
 */

import type { AuthUser } from '../types/auth';
import type { User } from '../types/user';

/**
 * Convert AuthUser to User (for initial user creation)
 * Creates a minimal User object from AuthUser that can be completed during onboarding
 */
export function authUserToUser(authUser: AuthUser): Partial<User> {
  return {
    id: authUser.id,
    email: authUser.email || '', // User type requires email, but we'll use empty string if not provided
    name: authUser.firstName || authUser.displayName || 'User',
    // Other fields will be filled during onboarding
    age: 0,
    gender: 'prefer-not-to-say',
    bio: '',
    photos: authUser.photoUrl ? [authUser.photoUrl] : [],
    prompts: [],
    selectedValues: [],
    locationCoordinates: null,
    locationLabel: null,
    createdAt: authUser.createdAt,
    updatedAt: authUser.updatedAt,
  };
}

/**
 * Extract AuthUser info from User (for session restoration)
 */
export function userToAuthUser(user: User, authProvider: 'google' | 'apple' | 'phone'): AuthUser {
  return {
    id: user.id,
    displayName: user.name,
    firstName: user.name.split(' ')[0],
    lastName: user.name.split(' ').slice(1).join(' ') || undefined,
    email: user.email || undefined,
    photoUrl: user.photos?.[0] || undefined,
    authProvider,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isOnboardingComplete: false, // Will be computed from user data
    isProfileComplete: false, // Will be computed from user data
    isValuesComplete: false, // Will be computed from user data
  };
}
