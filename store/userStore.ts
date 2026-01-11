/**
 * User Store
 * Manages current user state and profile
 */

import { create } from 'zustand';
import { User, UserProfile } from '../types/user';

interface UserStore {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;

  // Onboarding state flags
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isValuesComplete: boolean;
  isOnboardingComplete: boolean;

  // Actions
  setCurrentUser: (user: User) => void;
  createUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  createOrUpdateUser: (profileData: Partial<UserProfile> & { email: string; name: string }) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateValues: (values: string[]) => Promise<void>;
  completeOnboarding: () => void;
  logout: () => void;
  
  // Computed helpers
  checkProfileComplete: (user: User | null) => boolean;
  checkValuesComplete: (user: User | null) => boolean;
}

export const useUserStore = create<UserStore>((set, get) => ({
  // Initial state
  currentUser: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  isProfileComplete: false,
  isValuesComplete: false,
  isOnboardingComplete: false,

  // Helper to check if profile is complete
  checkProfileComplete: (user: User | null): boolean => {
    if (!user) return false;
    const hasRequiredFields = !!(user.name && user.age && user.location && user.bio && user.gender);
    const hasAtLeastOnePrompt = user.prompts.length >= 1 && user.prompts.every((p) => p.answer.trim().length > 0);
    return hasRequiredFields && hasAtLeastOnePrompt;
  },

  // Helper to check if values selection is complete
  checkValuesComplete: (user: User | null): boolean => {
    if (!user) return false;
    return user.selectedValues.length === 5; // Final top 5
  },

  // Set current user
  setCurrentUser: (user: User): void => {
    const isProfileComplete = get().checkProfileComplete(user);
    const isValuesComplete = get().checkValuesComplete(user);
    set({
      currentUser: user,
      isAuthenticated: true,
      isProfileComplete,
      isValuesComplete,
      isOnboardingComplete: isProfileComplete && isValuesComplete,
    });
  },

  // Create a new user
  createUser: async (userData: Omit<User, 'id' | 'createdAt'>): Promise<void> => {
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
        isLoading: false,
      });
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
      const updatedUser = await createOrUpdateUserBackend(userId, {
        ...profileData,
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
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save profile',
        isLoading: false,
      });
    }
  },

  // Update user profile
  updateProfile: async (profile: Partial<UserProfile>): Promise<void> => {
    const { currentUser } = get();
    if (!currentUser) return;

    set({ isLoading: true, error: null });
    try {
      const updatedUser: User = {
        ...currentUser,
        ...profile,
      };
      const isProfileComplete = get().checkProfileComplete(updatedUser);
      const isValuesComplete = get().checkValuesComplete(updatedUser);
      set({
        currentUser: updatedUser,
        isProfileComplete,
        isValuesComplete,
        isOnboardingComplete: isProfileComplete && isValuesComplete,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update profile',
        isLoading: false,
      });
    }
  },

  // Update user's selected values
  updateValues: async (values: string[]): Promise<void> => {
    const { currentUser } = get();
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
          isLoading: false,
        });
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

  // Logout
  logout: (): void => {
    set({
      currentUser: null,
      isAuthenticated: false,
      isProfileComplete: false,
      isValuesComplete: false,
      isOnboardingComplete: false,
      error: null,
    });
  },
}));
