/**
 * Values Completion Sync Hook
 * Syncs profile/values completion from UserStore back to AuthUser + Supabase user_metadata.
 * Ensures AuthUser.isValuesComplete stays in sync with UserStore.isValuesComplete and that
 * new sessions/devices receive the flags via the JWT before the profiles row loads.
 *
 * Onboarding only requires profile completion — values selection is optional and can complete
 * later, so this keeps re-syncing whenever isValuesComplete changes, even after onboarding.
 */

import { useEffect } from 'react';
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

  useEffect(() => {
    if (!authUser) return;

    const authValuesComplete = authUser.isValuesComplete ?? false;
    const authProfileComplete = authUser.isProfileComplete ?? false;
    const authOnboardingComplete = authUser.isOnboardingComplete ?? false;

    const expectedOnboardingComplete = isProfileComplete;

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
      // Re-fires whenever the flags above actually change (e.g. values completed after
      // onboarding), since the diff check naturally re-arms once authUser catches up.
      if (expectedOnboardingComplete) {
        supabase.auth
          .updateUser({
            data: {
              isProfileComplete: true,
              isValuesComplete,
              isOnboardingComplete: true,
            },
          })
          .then(({ error }) => {
            if (error) {
              if (__DEV__) {
                console.warn('[useValuesCompletionSync] user_metadata sync failed:', error.message);
              }
            } else if (__DEV__) {
              console.log('[useValuesCompletionSync] user_metadata updated');
            }
          });
      }
    }
  }, [authUser, isValuesComplete, isProfileComplete, updateAuthUser]);
}
