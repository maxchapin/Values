/**
 * Auth User Sync Hook
 * Syncs AuthUser + Supabase profile from AuthContext to UserStore when user signs in
 * or when profile is loaded/refreshed.
 *
 * - When profile is loaded from Supabase (profile row exists), we set User from profile
 *   so isProfileComplete / isValuesComplete match the DB and navigation shows main app.
 * - When profile is null (no row yet), we set a minimal User so onboarding is shown.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserStore } from '../store/userStore';
import { supabaseProfileToUser, updateSupabasePreferences } from '../services/supabaseProfile';
import type { User } from '../types/user';

/**
 * Syncs AuthContext (user + profile) to UserStore.
 * Waits until profile is resolved (profile !== undefined) so we don't show onboarding
 * for returning users before the profile fetch completes.
 */
export function useAuthUserSync(): void {
  const { user: authUser, profile } = useAuth();
  const { currentUser, setCurrentUser, isHydrated } = useUserStore();
  const syncedKeyRef = useRef<string>('');

  useEffect(() => {
    if (!isHydrated || !authUser) {
      syncedKeyRef.current = '';
      return;
    }

    // Wait until profile has been fetched (undefined = still loading)
    if (profile === undefined) {
      return;
    }

    const key = `${authUser.id}:${profile ? 'profile' : 'minimal'}`;
    if (syncedKeyRef.current === key) {
      return;
    }

    let user: User;

    if (profile) {
      const profileUser = supabaseProfileToUser(profile);
      const recoveredInterestedIn = profileUser.interestedIn ?? currentUser?.interestedIn;
      user = {
        ...profileUser,
        // If the Supabase profile pre-dates interested_in tracking in preferences,
        // preserve whatever is already in the store rather than overwriting with undefined.
        interestedIn: recoveredInterestedIn,
      };
      // Backfill into Supabase so it's there on next sign-in.
      if (!profileUser.interestedIn && recoveredInterestedIn) {
        updateSupabasePreferences({ interested_in: recoveredInterestedIn }).catch(() => {});
      }
    } else {
      user = {
        id: authUser.id,
        email: authUser.email || `user_${authUser.id}@temp.com`,
        name: authUser.firstName || authUser.displayName || 'User',
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

    syncedKeyRef.current = key;
    setCurrentUser(user, true)
      .then(() => {
        if (__DEV__) {
          console.log('[useAuthUserSync] Synced to UserStore:', profile ? 'from profile' : 'minimal', authUser.id);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.error('[useAuthUserSync] Error syncing to store:', error);
        }
        syncedKeyRef.current = '';
      });
  }, [authUser, profile, isHydrated, setCurrentUser, currentUser?.id]);
}
