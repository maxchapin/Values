/**
 * Auth User Sync Hook
 * Syncs AuthUser from AuthContext to UserStore when user signs in
 * Bridges the authentication layer with the user profile layer
 * 
 * Important: Only creates User in UserStore if one doesn't exist.
 * Preserves existing User data (profile/values) to avoid overwriting onboarding progress.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserStore } from '../store/userStore';
import { authUserToUser } from '../utils/authUserAdapter';
import type { User } from '../types/user';

/**
 * Syncs AuthUser to UserStore
 * When user signs in via AuthContext, creates/updates User in UserStore
 * 
 * Flow:
 * 1. User signs in → AuthUser created in AuthContext
 * 2. This hook detects new AuthUser
 * 3. If no User exists in UserStore → Create minimal User
 * 4. If User exists → Preserve existing data (don't overwrite)
 */
export function useAuthUserSync(): void {
  const { user: authUser } = useAuth();
  const { currentUser, setCurrentUser, isHydrated } = useUserStore();
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only sync if store is hydrated and we have an auth user
    if (!isHydrated || !authUser) {
      syncedUserIdRef.current = null;
      return;
    }

    // If we already synced this user, don't sync again
    if (syncedUserIdRef.current === authUser.id) {
      return;
    }

    // If we already have a user with the same ID, preserve it
    // (user might have completed profile/values onboarding)
    if (currentUser?.id === authUser.id) {
      syncedUserIdRef.current = authUser.id;
      return;
    }

    // Convert AuthUser to User and set in store
    // This creates a minimal User that will be completed during onboarding
    const userData = authUserToUser(authUser);
    
    // Create minimal User object (required fields)
    // Profile and values will be filled during onboarding
    const user: User = {
      id: authUser.id,
      email: authUser.email || `user_${authUser.id}@temp.com`, // Temporary email if not provided
      name: authUser.firstName || authUser.displayName || 'User',
      age: 0, // Will be set during profile setup
      gender: 'prefer-not-to-say', // Will be set during profile setup
      bio: '', // Will be set during profile setup
      photos: authUser.photoUrl ? [authUser.photoUrl] : [],
      prompts: [], // Will be set during profile setup
      selectedValues: [], // Will be set during values onboarding
      locationCoordinates: null, // Will be set during profile setup
      locationLabel: null,
      createdAt: authUser.createdAt,
      updatedAt: authUser.updatedAt,
    };

    // Set user in store (this will trigger onboarding flow if profile incomplete)
    setCurrentUser(user, true)
      .then(() => {
        syncedUserIdRef.current = authUser.id;
        if (__DEV__) {
          console.log('[useAuthUserSync] Synced AuthUser to UserStore:', authUser.id);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.error('[useAuthUserSync] Error syncing auth user to store:', error);
        }
      });
  }, [authUser, currentUser, isHydrated, setCurrentUser]);
}
