/**
 * Matches Store
 * Manages available matches, likes, and matching logic
 */

import { create } from 'zustand';
import { Match } from '../types/match';

interface MatchFilters {
  ageRange?: [number, number]; // [minAge, maxAge]
  location?: string;
}

interface MatchesStore {
  // State
  availableMatches: Match[];
  likedUserIds: string[]; // Array of user IDs the current user has liked
  filters: MatchFilters;
  currentMatchIndex: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadMatches: (userId: string, filters?: MatchFilters) => Promise<void>;
  setFilters: (filters: MatchFilters) => Promise<void>;
  likeUser: (userId: string) => void;
  passUser: (userId: string) => void;
  getCurrentMatch: () => Match | null;
  getLikedMatches: () => Match[];
  reset: () => void;
}

// Helper to get current user (avoid circular dependency)
function getCurrentUser() {
  const { useUserStore } = require('./userStore');
  return useUserStore.getState().currentUser;
}

export const useMatchesStore = create<MatchesStore>((set, get) => ({
  // Initial state
  availableMatches: [],
  likedUserIds: [],
  filters: {},
  currentMatchIndex: 0,
  isLoading: false,
  error: null,

  // Load matches for a user
  loadMatches: async (userId: string, filters?: MatchFilters): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const { findMatches } = await import('../services/mockBackend');
      const matches = await findMatches(userId, filters);
      
      // Ensure matches is always an array (defensive check)
      const safeMatches = Array.isArray(matches) ? matches : [];
      
      set({
        availableMatches: safeMatches,
        currentMatchIndex: 0, // Always reset to beginning when loading new matches
        filters: filters || {},
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load matches',
        availableMatches: [], // Clear matches on error
        currentMatchIndex: 0,
        isLoading: false,
      });
    }
  },

  // Set filters and reload matches
  setFilters: async (filters: MatchFilters): Promise<void> => {
    const { loadMatches } = get();
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Reset index before loading with new filters
      set({ filters, currentMatchIndex: 0 });
      await loadMatches(currentUser.id, filters);
    }
  },

  // Like a user
  likeUser: (userId: string): void => {
    const { likedUserIds, availableMatches, currentMatchIndex } = get();
    
    // Defensive check: ensure we have matches
    if (availableMatches.length === 0) {
      return;
    }

    // Add to liked list if not already there
    if (!likedUserIds.includes(userId)) {
      set({ likedUserIds: [...likedUserIds, userId] });
    }

    // Move to next match, ensuring index stays within bounds
    const nextIndex = Math.min(currentMatchIndex + 1, availableMatches.length);
    set({ currentMatchIndex: nextIndex });
  },

  // Pass on a user
  passUser: (userId: string): void => {
    const { availableMatches, currentMatchIndex } = get();
    
    // Defensive check: ensure we have matches
    if (availableMatches.length === 0) {
      return;
    }

    // Move to next match, ensuring index stays within bounds
    const nextIndex = Math.min(currentMatchIndex + 1, availableMatches.length);
    set({ currentMatchIndex: nextIndex });
  },

  // Get current match with defensive checks
  getCurrentMatch: (): Match | null => {
    const { availableMatches, currentMatchIndex } = get();
    
    // Defensive checks: ensure index is valid and match exists
    if (
      availableMatches.length === 0 ||
      currentMatchIndex < 0 ||
      currentMatchIndex >= availableMatches.length
    ) {
      return null;
    }

    const match = availableMatches[currentMatchIndex];
    return match || null;
  },

  // Get matches for users that were liked
  getLikedMatches: (): Match[] => {
    const { availableMatches, likedUserIds } = get();
    
    // Defensive check: ensure we have matches
    if (availableMatches.length === 0 || likedUserIds.length === 0) {
      return [];
    }

    return availableMatches.filter((match) => {
      // Defensive check: ensure match and user exist
      if (!match || !match.user || !match.user.id) {
        return false;
      }
      return likedUserIds.includes(match.user.id);
    });
  },

  // Reset store
  reset: (): void => {
    set({
      availableMatches: [],
      likedUserIds: [],
      currentMatchIndex: 0,
      filters: {},
      error: null,
    });
  },
}));
