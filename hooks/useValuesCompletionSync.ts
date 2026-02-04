/**
 * Values Completion Sync Hook
 * Syncs values onboarding completion from UserStore back to AuthUser
 * Ensures AuthUser.isValuesComplete stays in sync with UserStore.isValuesComplete
 */

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserStore } from '../store/userStore';

/**
 * Syncs values completion status from UserStore to AuthUser
 * When values onboarding completes, updates AuthUser.isValuesComplete flag
 */
export function useValuesCompletionSync(): void {
  const { user: authUser, updateAuthUser } = useAuth();
  const isValuesComplete = useUserStore((state) => state.isValuesComplete);
  const isProfileComplete = useUserStore((state) => state.isProfileComplete);

  useEffect(() => {
    // Only sync if we have an auth user
    if (!authUser) {
      return;
    }

    // Check if values completion status has changed
    const authValuesComplete = authUser.isValuesComplete ?? false;
    const authProfileComplete = authUser.isProfileComplete ?? false;
    const authOnboardingComplete = authUser.isOnboardingComplete ?? false;

    // Calculate expected onboarding completion
    const expectedOnboardingComplete = isProfileComplete && isValuesComplete;

    // Update if status has changed
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
    }
  }, [authUser, isValuesComplete, isProfileComplete, updateAuthUser]);
}
