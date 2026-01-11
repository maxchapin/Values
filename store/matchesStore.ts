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
      set({
        availableMatches: matches,
        currentMatchIndex: 0,
        filters: filters || {},
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load matches',
        isLoading: false,
      });
    }
  },

  // Set filters and reload matches
  setFilters: async (filters: MatchFilters): Promise<void> => {
    const { loadMatches } = get();
    const currentUser = getCurrentUser();
    if (currentUser) {
      set({ filters });
      await loadMatches(currentUser.id, filters);
    }
  },

  // Like a user
  likeUser: (userId: string): void => {
    const { likedUserIds, availableMatches, currentMatchIndex } = get();
    
    // Add to liked list if not already there
    if (!likedUserIds.includes(userId)) {
      set({ likedUserIds: [...likedUserIds, userId] });
    }

    // Move to next match
    if (currentMatchIndex < availableMatches.length - 1) {
      set({ currentMatchIndex: currentMatchIndex + 1 });
    } else {
      set({ currentMatchIndex: availableMatches.length });
    }
  },

  // Pass on a user
  passUser: (userId: string): void => {
    const { availableMatches, currentMatchIndex } = get();
    
    // Move to next match (don't add to liked list)
    if (currentMatchIndex < availableMatches.length - 1) {
      set({ currentMatchIndex: currentMatchIndex + 1 });
    } else {
      set({ currentMatchIndex: availableMatches.length });
    }
  },

  // Get current match
  getCurrentMatch: (): Match | null => {
    const { availableMatches, currentMatchIndex } = get();
    return availableMatches[currentMatchIndex] || null;
  },

  // Get matches for users that were liked
  getLikedMatches: (): Match[] => {
    const { availableMatches, likedUserIds } = get();
    return availableMatches.filter((match) => likedUserIds.includes(match.user.id));
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
