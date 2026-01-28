/**
 * User Store
 * Manages current user state and profile
 */

import { create } from 'zustand';
import { User, UserProfile } from '../types/user';
import { saveUserData, saveAuthState, clearPersistedData } from '../services/persistence';
import { MAX_PROFILE_PHOTOS } from '../constants/profile';

interface UserStore {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean; // Track if store has been hydrated from storage

  // Onboarding state flags
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isValuesComplete: boolean;
  isOnboardingComplete: boolean;
  keepSignedIn: boolean; // "Keep me signed in" preference

  // Actions
  setCurrentUser: (user: User, keepSignedIn?: boolean) => Promise<void>;
  createUser: (userData: Omit<User, 'id' | 'createdAt'>, keepSignedIn?: boolean) => Promise<void>;
  createOrUpdateUser: (profileData: Partial<UserProfile> & { email: string; name: string }) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateValues: (values: string[]) => Promise<void>;
  completeOnboarding: () => void;
  logout: () => Promise<void>;
  rehydrate: (user: User, isProfileComplete: boolean, isValuesComplete: boolean, keepSignedIn: boolean) => void;
  setKeepSignedIn: (keepSignedIn: boolean) => void;
  
  // Computed helpers
  checkProfileComplete: (user: User | null) => boolean;
  checkValuesComplete: (user: User | null) => boolean;
}

export const useUserStore = create<UserStore>((set, get) => ({
  // Initial state
  currentUser: null,
  isLoading: false,
  error: null,
  isHydrated: false,
  isAuthenticated: false,
  isProfileComplete: false,
  isValuesComplete: false,
  isOnboardingComplete: false,
  keepSignedIn: false,

  // Helper to check if profile is complete
  checkProfileComplete: (user: User | null): boolean => {
    if (!user) return false;
    const hasLocationPin = !!(
      user.locationCoordinates &&
      typeof user.locationCoordinates.latitude === 'number' &&
      typeof user.locationCoordinates.longitude === 'number'
    );
    const hasRequiredFields = !!(
      user.name &&
      user.age &&
      user.bio &&
      user.gender &&
      user.hometown &&
      user.interestedIn &&
      hasLocationPin
    );
    const hasAtLeastOnePrompt =
      Array.isArray(user.prompts) &&
      user.prompts.length >= 1 &&
      user.prompts.every((p) => (p?.question ?? '').trim().length > 0 && (p?.answer ?? '').trim().length > 0);
    return hasRequiredFields && hasAtLeastOnePrompt;
  },

  // Helper to check if values selection is complete
  checkValuesComplete: (user: User | null): boolean => {
    if (!user) return false;
    return user.selectedValues.length === 5; // Final top 5
  },

  // Set current user
  setCurrentUser: async (user: User, keepSignedIn: boolean = false): Promise<void> => {
    const isProfileComplete = get().checkProfileComplete(user);
    const isValuesComplete = get().checkValuesComplete(user);
    set({
      currentUser: user,
      isAuthenticated: true,
      isProfileComplete,
      isValuesComplete,
      isOnboardingComplete: isProfileComplete && isValuesComplete,
      keepSignedIn,
    });
    
    // Persist user data and auth state
    try {
      await saveUserData(user, isProfileComplete, isValuesComplete);
      await saveAuthState({
        isAuthenticated: true,
        userId: user.id,
        keepSignedIn,
      });
    } catch (error) {
      if (__DEV__) {
        console.error('[UserStore] Error persisting user data:', error);
      }
    }
  },

  // Create a new user
  createUser: async (userData: Omit<User, 'id' | 'createdAt'>, keepSignedIn: boolean = false): Promise<void> => {
    if (__DEV__) {
      console.log('[UserStore] createUser called with keepSignedIn:', keepSignedIn);
    }
    
    set({ isLoading: true, error: null });
    try {
      const { createUser } = await import('../services/mockBackend');
      const newUser = await createUser(userData);
      const isProfileComplete = get().checkProfileComplete(newUser);
      set({
        currentUser: newUser,
        isAuthenticated: true,
        isProfileComplete,
        isValuesComplete: false,
        isOnboardingComplete: false,
        keepSignedIn,
        isLoading: false,
      });
      
      if (__DEV__) {
        console.log('[UserStore] Store updated with keepSignedIn:', keepSignedIn);
      }
      
      // Persist user data and auth state
      try {
        await saveUserData(newUser, isProfileComplete, false);
        const authState = {
          isAuthenticated: true,
          userId: newUser.id,
          keepSignedIn,
        };
        if (__DEV__) {
          console.log('[UserStore] Saving auth state with keepSignedIn:', keepSignedIn, 'authState:', authState);
        }
        await saveAuthState(authState);
        if (__DEV__) {
          console.log('[UserStore] ✅ Auth state saved successfully');
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[UserStore] Error persisting user data:', error);
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create user',
        isLoading: false,
      });
    }
  },

  // Create or update user profile (used in profile setup)
  createOrUpdateUser: async (profileData: Partial<UserProfile> & { email: string; name: string }): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const { createOrUpdateUser: createOrUpdateUserBackend } = await import('../services/mockBackend');
      const userId = get().currentUser?.id || null;
      let { keepSignedIn: storeKeepSignedIn } = get(); // Preserve keepSignedIn preference
      
      if (__DEV__) {
        console.log('[UserStore] createOrUpdateUser - store keepSignedIn:', storeKeepSignedIn);
      }
      
      // ALWAYS check storage to ensure we have the most up-to-date value
      // This prevents the store value from being stale or incorrect
      if (userId) {
        try {
          const { loadAuthState } = await import('../services/persistence');
          const persistedAuth = await loadAuthState();
          if (persistedAuth) {
            if (__DEV__) {
              console.log('[UserStore] createOrUpdateUser - loaded from storage:', {
                keepSignedIn: persistedAuth.keepSignedIn,
                userId: persistedAuth.userId,
              });
            }
            // Use storage value if it exists (it's the source of truth)
            if (persistedAuth.userId === userId) {
              storeKeepSignedIn = persistedAuth.keepSignedIn;
              if (__DEV__) {
                console.log('[UserStore] createOrUpdateUser - using keepSignedIn from storage:', storeKeepSignedIn);
              }
            }
          } else {
            if (__DEV__) {
              console.log('[UserStore] createOrUpdateUser - no persisted auth found, using store value:', storeKeepSignedIn);
            }
          }
        } catch (error) {
          // Ignore storage read errors, use store value
          if (__DEV__) {
            console.warn('[UserStore] Could not read keepSignedIn from storage:', error);
          }
        }
      }
      
      const keepSignedIn = storeKeepSignedIn;
      
      if (__DEV__) {
        console.log('[UserStore] createOrUpdateUser - final keepSignedIn value to use:', keepSignedIn);
      }
      
      const photos = (profileData.photos ?? []).slice(0, MAX_PROFILE_PHOTOS);
      const updatedUser = await createOrUpdateUserBackend(userId, {
        ...profileData,
        photos,
        email: profileData.email || get().currentUser?.email || '',
      });
      const isProfileComplete = get().checkProfileComplete(updatedUser);
      const isValuesComplete = get().checkValuesComplete(updatedUser);
      set({
        currentUser: updatedUser,
        isAuthenticated: true,
        isProfileComplete,
        isValuesComplete,
        isOnboardingComplete: isProfileComplete && isValuesComplete,
        keepSignedIn, // Preserve keepSignedIn in store state
        isLoading: false,
      });
      
      // Persist updated user data and auth state (preserving keepSignedIn)
      try {
        await saveUserData(updatedUser, isProfileComplete, isValuesComplete);
        const authState = {
          isAuthenticated: true,
          userId: updatedUser.id,
          keepSignedIn,
        };
        if (__DEV__) {
          console.log('[UserStore] Saving auth state in createOrUpdateUser with keepSignedIn:', keepSignedIn, 'authState:', authState);
        }
        await saveAuthState(authState);
        if (__DEV__) {
          console.log('[UserStore] ✅ Auth state updated successfully');
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[UserStore] Error persisting user data:', error);
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save profile',
        isLoading: false,
      });
    }
  },

  // Update user profile
  updateProfile: async (profile: Partial<UserProfile>): Promise<void> => {
    const { currentUser, keepSignedIn } = get();
    if (!currentUser) return;

    set({ isLoading: true, error: null });
    try {
      const photos =
        profile.photos !== undefined
          ? profile.photos.slice(0, MAX_PROFILE_PHOTOS)
          : currentUser.photos;
      const updatedUser: User = {
        ...currentUser,
        ...profile,
        photos,
      };
      const isProfileComplete = get().checkProfileComplete(updatedUser);
      const isValuesComplete = get().checkValuesComplete(updatedUser);
      set({
        currentUser: updatedUser,
        isProfileComplete,
        isValuesComplete,
        isOnboardingComplete: isProfileComplete && isValuesComplete,
        keepSignedIn, // Preserve keepSignedIn
        isLoading: false,
      });
      
      // Persist updated user data and auth state (preserving keepSignedIn)
      try {
        await saveUserData(updatedUser, isProfileComplete, isValuesComplete);
        await saveAuthState({
          isAuthenticated: true,
          userId: updatedUser.id,
          keepSignedIn,
        });
      } catch (error) {
        if (__DEV__) {
          console.error('[UserStore] Error persisting user data:', error);
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update profile',
        isLoading: false,
      });
    }
  },

  // Update user's selected values
  updateValues: async (values: string[]): Promise<void> => {
    const { currentUser, keepSignedIn } = get();
    if (!currentUser) return;

    set({ isLoading: true, error: null });
    try {
      const { updateUserValues } = await import('../services/mockBackend');
      const updatedUser = await updateUserValues(currentUser.id, values);
      if (updatedUser) {
        const isProfileComplete = get().checkProfileComplete(updatedUser);
        const isValuesComplete = get().checkValuesComplete(updatedUser);
        set({
          currentUser: updatedUser,
          isValuesComplete,
          isOnboardingComplete: isProfileComplete && isValuesComplete,
          keepSignedIn, // Preserve keepSignedIn
          isLoading: false,
        });
        
        // Persist updated user data and auth state (preserving keepSignedIn)
        try {
          await saveUserData(updatedUser, isProfileComplete, isValuesComplete);
          await saveAuthState({
            isAuthenticated: true,
            userId: updatedUser.id,
            keepSignedIn,
          });
        } catch (error) {
          if (__DEV__) {
            console.error('[UserStore] Error persisting user data:', error);
          }
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update values',
        isLoading: false,
      });
    }
  },

  // Mark onboarding as complete
  completeOnboarding: (): void => {
    set({ isOnboardingComplete: true });
  },

  // Logout - clears storage and resets state
  logout: async (): Promise<void> => {
    if (__DEV__) {
      console.log('[UserStore] Logout initiated - clearing all persisted data');
    }
    
    try {
      // Clear all persisted data
      await clearPersistedData();
      if (__DEV__) {
        console.log('[UserStore] ✅ All persisted data cleared from storage');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[UserStore] ❌ Error clearing persisted data:', error);
      }
    }
    
    // Reset user store
    set({
      currentUser: null,
      isAuthenticated: false,
      isProfileComplete: false,
      isValuesComplete: false,
      isOnboardingComplete: false,
      keepSignedIn: false,
      isHydrated: true, // Keep hydrated flag true so navigator can render
      error: null,
    });
    
    if (__DEV__) {
      console.log('[UserStore] ✅ User store reset to logged out state');
    }
    
    // Also reset matches store
    try {
      const { useMatchesStore } = await import('./matchesStore');
      useMatchesStore.getState().reset();
      if (__DEV__) {
        console.log('[UserStore] ✅ Matches store reset');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[UserStore] ❌ Error resetting matches store:', error);
      }
    }

    // Also reset values selection store (prevents stale step/selections after logout)
    try {
      const { useValuesSelectionStore } = await import('./valuesSelectionStore');
      useValuesSelectionStore.getState().reset();
      if (__DEV__) {
        console.log('[UserStore] ✅ Values selection store reset');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[UserStore] ❌ Error resetting values selection store:', error);
      }
    }
    
    if (__DEV__) {
      console.log('[UserStore] ✅ Logout complete - user will see welcome screen on next app start');
    }
  },

  // Rehydrate store from persisted data
  rehydrate: (user: User, isProfileComplete: boolean, isValuesComplete: boolean, keepSignedIn: boolean): void => {
    set({
      currentUser: user,
      isAuthenticated: true,
      isProfileComplete,
      isValuesComplete,
      isOnboardingComplete: isProfileComplete && isValuesComplete,
      keepSignedIn,
      isHydrated: true,
    });
  },

  // Set "Keep me signed in" preference
  setKeepSignedIn: async (keepSignedIn: boolean): Promise<void> => {
    set({ keepSignedIn });
    
    // Update persisted auth state
    const { currentUser } = get();
    if (currentUser) {
      try {
        await saveAuthState({
          isAuthenticated: true,
          userId: currentUser.id,
          keepSignedIn,
        });
      } catch (error) {
        if (__DEV__) {
          console.error('[UserStore] Error persisting keepSignedIn:', error);
        }
      }
    }
  },
}));
