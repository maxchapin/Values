/**
 * Values Completion Sync Hook
 * Syncs values onboarding completion from UserStore back to AuthUser + Supabase user_metadata.
 * Ensures AuthUser.isValuesComplete stays in sync with UserStore.isValuesComplete and that
 * new sessions/devices receive the flags via the JWT before the profiles row loads.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserStore } from '../store/userStore';
import { supabase } from '../services/supabase';

/**
 * Syncs values completion status from UserStore to AuthUser + Supabase user_metadata.
 */
export function useValuesCompletionSync(): void {
  const { user: authUser, updateAuthUser } = useAuth();
  const isValuesComplete = useUserStore((state) => state.isValuesComplete);
  const isProfileComplete = useUserStore((state) => state.isProfileComplete);
  const metadataSyncedRef = useRef(false);

  useEffect(() => {
    if (!authUser) {
      metadataSyncedRef.current = false;
      return;
    }

    const authValuesComplete = authUser.isValuesComplete ?? false;
    const authProfileComplete = authUser.isProfileComplete ?? false;
    const authOnboardingComplete = authUser.isOnboardingComplete ?? false;

    const expectedOnboardingComplete = isProfileComplete && isValuesComplete;

    if (
      authValuesComplete !== isValuesComplete ||
      authProfileComplete !== isProfileComplete ||
      authOnboardingComplete !== expectedOnboardingComplete
    ) {
      updateAuthUser({
        isValuesComplete,
        isProfileComplete,
        isOnboardingComplete: expectedOnboardingComplete,
      }).catch((error) => {
        if (__DEV__) {
          console.error('[useValuesCompletionSync] Error syncing completion status:', error);
        }
      });

      // Mirror to Supabase user_metadata so new devices/sessions get flags from the JWT.
      if (expectedOnboardingComplete && !metadataSyncedRef.current) {
        metadataSyncedRef.current = true;
        supabase.auth
          .updateUser({
            data: {
              isProfileComplete: true,
              isValuesComplete: true,
              isOnboardingComplete: true,
            },
          })
          .then(({ error }) => {
            if (error) {
              metadataSyncedRef.current = false;
              if (__DEV__) {
                console.warn('[useValuesCompletionSync] user_metadata sync failed:', error.message);
              }
            } else if (__DEV__) {
              console.log('[useValuesCompletionSync] user_metadata updated (onboarding complete)');
            }
          });
      }
    }
  }, [authUser, isValuesComplete, isProfileComplete, updateAuthUser]);
}
