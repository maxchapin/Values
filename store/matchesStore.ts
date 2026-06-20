/**
 * Matches Store
 * Discover: ranked pool from Supabase (or mock in dev when allowed); queue excludes swiped targets.
 * Set EXPO_PUBLIC_ALLOW_MOCK_DISCOVER=false to forbid mock fallback even in __DEV__.
 */

import { create } from 'zustand';

const mockDiscoverAllowed =
  __DEV__ && process.env.EXPO_PUBLIC_ALLOW_MOCK_DISCOVER !== 'false';
import { Match } from '../types/match';
import { saveMatchesState } from '../services/persistence';
import {
  buildDiscoverQueueFromPool,
  buildDiscoverQueueExcludingTargets,
  pruneExpiredPassSwipes,
  type PassedSwipeRecord,
} from '../services/discoverFeedPolicy';

import type { LocationCoordinates, InterestedIn } from '../types/user';

export interface MatchFilters {
  ageRange?: [number, number];
  centerCoordinates?: LocationCoordinates;
  radiusMiles?: number;
  interestedIn?: InterestedIn;
}

export interface ConversationPreviewData {
  lastMessage: string;
  unreadCount: number;
  lastMessageAt?: number;
}

export type { PassedSwipeRecord };

export type DiscoverSwipeMode = 'supabase' | 'mock';

interface MatchesStore {
  discoverSwipeMode: DiscoverSwipeMode;
  rankedDiscoverPool: Match[];
  rankedDiscoverPoolLength: number;
  availableMatches: Match[];
  /** Mock: one-way likes. Supabase: mutual partner ids (synced with server). */
  likedUserIds: string[];
  passedSwipes: PassedSwipeRecord[];
  /** Supabase: targets already swiped (like or pass). */
  swipedTargetIds: string[];
  mutualMatches: Match[];
  matchIdByPartnerUserId: Record<string, string>;
  filters: MatchFilters;
  currentMatchIndex: number;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
  _conversationPreviews: Record<string, ConversationPreviewData>;

  loadMatches: (userId: string, filters?: MatchFilters) => Promise<void>;
  setFilters: (filters: MatchFilters) => Promise<void>;
  likeUser: (userId: string) => Promise<void>;
  passUser: (userId: string) => Promise<void>;
  getCurrentMatch: () => Match | null;
  getLikedMatches: () => Match[];
  /** Matches tab list: mutuals in Supabase mode; mocked one-way likes in mock mode. */
  getMatchesForTab: () => Match[];
  unmatchUser: (userId: string) => Promise<void>;
  getConversationPreview: (userId: string) => { lastMessage: string; unreadCount: number; lastMessageAt?: number };
  setConversationPreview: (userId: string, lastMessage: string, unreadCount?: number, lastMessageAt?: number) => void;
  markConversationRead: (userId: string) => void;
  reset: () => void;
  rehydrate: (likedUserIds: string[], filters: MatchFilters, passedSwipes?: PassedSwipeRecord[]) => void;
}

function getCurrentUser() {
  const { useUserStore } = require('./userStore');
  return useUserStore.getState().currentUser;
}

async function applySupabaseDiscoverState(
  set: (partial: Partial<MatchesStore>) => void,
  get: () => MatchesStore,
  rankedPool: Match[],
  filtersUpdate: MatchFilters | undefined,
  userId: string,
  currentUser: import('../types/user').User
): Promise<void> {
  const {
    fetchSwipedTargetIds,
    buildMutualMatchesForViewer,
  } = await import('../services/supabaseMatching');
  const swipedIds = await fetchSwipedTargetIds(userId);
  const { matches: mutualMatches, matchIdByPartnerUserId } = await buildMutualMatchesForViewer(
    userId,
    currentUser
  );
  const likedIds = mutualMatches.map((m) => m.user.id);
  const queue = buildDiscoverQueueExcludingTargets(rankedPool, new Set(swipedIds));
  set({
    discoverSwipeMode: 'supabase',
    rankedDiscoverPool: rankedPool,
    rankedDiscoverPoolLength: rankedPool.length,
    availableMatches: queue,
    swipedTargetIds: swipedIds,
    mutualMatches,
    matchIdByPartnerUserId,
    likedUserIds: likedIds,
    passedSwipes: [],
    currentMatchIndex: 0,
    filters: filtersUpdate !== undefined ? filtersUpdate : get().filters,
    isLoading: false,
    error: null,
  });
  try {
    await saveMatchesState(likedIds, get().filters, []);
  } catch (e) {
    if (__DEV__) console.error('[MatchesStore] persist after supabase load:', e);
  }
}

function applyMockDiscoverState(
  set: (partial: Partial<MatchesStore>) => void,
  get: () => MatchesStore,
  rankedPool: Match[],
  filtersUpdate: MatchFilters | undefined
): void {
  const { likedUserIds, passedSwipes } = get();
  const pruned = pruneExpiredPassSwipes(passedSwipes);
  const queue = buildDiscoverQueueFromPool(rankedPool, likedUserIds, pruned);
  set({
    discoverSwipeMode: 'mock',
    rankedDiscoverPool: rankedPool,
    rankedDiscoverPoolLength: rankedPool.length,
    availableMatches: queue,
    passedSwipes: pruned,
    swipedTargetIds: [],
    mutualMatches: [],
    matchIdByPartnerUserId: {},
    currentMatchIndex: 0,
    filters: filtersUpdate !== undefined ? filtersUpdate : get().filters,
    isLoading: false,
    error: null,
  });
}

export const useMatchesStore = create<MatchesStore>((set, get) => ({
  discoverSwipeMode: 'supabase',
  rankedDiscoverPool: [],
  rankedDiscoverPoolLength: 0,
  availableMatches: [],
  likedUserIds: [],
  passedSwipes: [],
  swipedTargetIds: [],
  mutualMatches: [],
  matchIdByPartnerUserId: {},
  filters: {},
  currentMatchIndex: 0,
  isLoading: false,
  error: null,
  isHydrated: false,
  _conversationPreviews: {},

  loadMatches: async (userId: string, filters?: MatchFilters): Promise<void> => {
    if (!userId || typeof userId !== 'string') {
      set({
        isLoading: false,
        error: 'Missing user id',
        rankedDiscoverPool: [],
        rankedDiscoverPoolLength: 0,
        availableMatches: [],
        currentMatchIndex: 0,
      });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.id !== userId) {
        set({
          isLoading: false,
          error: 'Could not load your profile. Try signing in again.',
          rankedDiscoverPool: [],
          rankedDiscoverPoolLength: 0,
          availableMatches: [],
          currentMatchIndex: 0,
        });
        return;
      }

      const mergedFilters: MatchFilters = {
        ...(filters ?? get().filters ?? {}),
        centerCoordinates: (filters ?? get().filters)?.centerCoordinates ?? currentUser?.locationCoordinates ?? undefined,
        interestedIn: (filters ?? get().filters)?.interestedIn ?? currentUser?.interestedIn ?? undefined,
      };

      const { getDiscoveryProfiles, discoveryProfileRowToUser, getDiscoveryProfileRowsByIds } = await import('../services/supabaseProfile');
      const { buildMatchListForDiscover } = await import('../services/mockBackend');

      // Check-in overlap matches are ranked first; city-wide candidates fill the rest of the
      // queue once check-in matches run out. Both segments respect the same gender/age/radius
      // filters (buildMatchListForDiscover applies them uniformly).
      const { getCheckinFeed } = await import('../services/supabaseCheckin');
      const feedRows = await getCheckinFeed(userId); // never throws

      let checkinMatches: Match[] = [];
      if (feedRows.length > 0) {
        const userIds = feedRows.map((r) => r.user_id);
        const profileRows = await getDiscoveryProfileRowsByIds(userIds);
        const candidates = profileRows.map(discoveryProfileRowToUser);
        const baseMatches = buildMatchListForDiscover(currentUser, candidates, mergedFilters, {
          applyRelaxedFallback: false,
        });
        const feedMap = new Map(feedRows.map((r) => [r.user_id, r]));
        checkinMatches = baseMatches
          .map((m) => ({ ...m, sharedVenueName: feedMap.get(m.user.id)?.latest_shared_venue_name }))
          .sort((a, b) => {
            const aCount = feedMap.get(a.user.id)?.overlap_count ?? 0;
            const bCount = feedMap.get(b.user.id)?.overlap_count ?? 0;
            return bCount - aCount || b.similarityScore - a.similarityScore;
          });
      }

      // City-wide candidates always fill the tail of the deck, minus anyone already
      // surfaced via check-in overlap (avoid showing the same person twice).
      const checkinIds = new Set(checkinMatches.map((m) => m.user.id));
      const cityRows = await getDiscoveryProfiles(userId, { interestedIn: mergedFilters.interestedIn });
      const cityCandidates = cityRows
        .map(discoveryProfileRowToUser)
        .filter((u) => !checkinIds.has(u.id));
      const cityMatches = buildMatchListForDiscover(currentUser, cityCandidates, mergedFilters, {
        applyRelaxedFallback: mockDiscoverAllowed,
      });

      let matches: Match[] = [...checkinMatches, ...cityMatches];

      let usedMockFallback = false;
      if (matches.length === 0 && mockDiscoverAllowed) {
        const { findMatches } = await import('../services/mockBackend');
        matches = await findMatches(userId, mergedFilters);
        usedMockFallback = true;
      }

      const safeMatches = Array.isArray(matches) ? matches : [];
      const filtersToStore = filters ?? get().filters ?? {};

      if (usedMockFallback) {
        applyMockDiscoverState(set, get, safeMatches, filtersToStore);
      } else {
        await applySupabaseDiscoverState(set, get, safeMatches, filtersToStore, userId, currentUser);
      }
    } catch (error) {
      if (mockDiscoverAllowed) {
        try {
          const { findMatches } = await import('../services/mockBackend');
          const currentUser = getCurrentUser();
          if (currentUser && currentUser.id === userId) {
            const mergedFilters: MatchFilters = {
              ...(filters ?? get().filters ?? {}),
              centerCoordinates: (filters ?? get().filters)?.centerCoordinates ?? currentUser?.locationCoordinates ?? undefined,
              interestedIn: (filters ?? get().filters)?.interestedIn ?? currentUser?.interestedIn ?? undefined,
            };
            const fallback = await findMatches(userId, mergedFilters);
            const safeMatches = Array.isArray(fallback) ? fallback : [];
            applyMockDiscoverState(set, get, safeMatches, filters ?? get().filters ?? {});
            return;
          }
        } catch {
          // fall through
        }
      }
      set({
        error: error instanceof Error ? error.message : 'Failed to load matches',
        rankedDiscoverPool: [],
        rankedDiscoverPoolLength: 0,
        availableMatches: [],
        currentMatchIndex: 0,
        isLoading: false,
      });
    }
  },

  setFilters: async (filters: MatchFilters): Promise<void> => {
    const { loadMatches } = get();
    const currentUser = getCurrentUser();
    if (currentUser) {
      set({ filters, currentMatchIndex: 0 });
      await loadMatches(currentUser.id, filters);
      try {
        const st = get();
        await saveMatchesState(st.likedUserIds, st.filters, st.discoverSwipeMode === 'mock' ? st.passedSwipes : []);
      } catch (error) {
        if (__DEV__) console.error('[MatchesStore] Error persisting matches state:', error);
      }
    }
  },

  likeUser: async (userId: string): Promise<void> => {
    const state = get();
    if (state.rankedDiscoverPool.length === 0 && state.availableMatches.length === 0) return;

    if (state.discoverSwipeMode === 'mock') {
      const newLikedUserIds = state.likedUserIds.includes(userId)
        ? state.likedUserIds
        : [...state.likedUserIds, userId];
      const pruned = pruneExpiredPassSwipes(state.passedSwipes);
      const queue = buildDiscoverQueueFromPool(state.rankedDiscoverPool, newLikedUserIds, pruned);
      set({
        likedUserIds: newLikedUserIds,
        passedSwipes: pruned,
        availableMatches: queue,
        currentMatchIndex: 0,
      });
      try {
        await saveMatchesState(newLikedUserIds, state.filters, pruned);
      } catch (error) {
        if (__DEV__) console.error('[MatchesStore] persist like (mock):', error);
      }
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      const { recordProfileSwipe } = await import('../services/supabaseMatching');
      await recordProfileSwipe(currentUser.id, userId, 'like');
      await applySupabaseDiscoverState(
        set,
        get,
        state.rankedDiscoverPool,
        state.filters,
        currentUser.id,
        currentUser
      );
    } catch (e) {
      if (__DEV__) console.error('[MatchesStore] likeUser supabase:', e);
      throw e;
    }
  },

  passUser: async (userId: string): Promise<void> => {
    const state = get();
    if (state.availableMatches.length === 0 && state.rankedDiscoverPool.length === 0) return;

    if (state.discoverSwipeMode === 'mock') {
      const nextPasses = pruneExpiredPassSwipes([
        ...state.passedSwipes,
        { userId, passedAt: new Date().toISOString() },
      ]);
      const queue = buildDiscoverQueueFromPool(state.rankedDiscoverPool, state.likedUserIds, nextPasses);
      set({
        passedSwipes: nextPasses,
        availableMatches: queue,
        currentMatchIndex: 0,
      });
      saveMatchesState(state.likedUserIds, state.filters, nextPasses).catch((err) => {
        if (__DEV__) console.error('[MatchesStore] persist pass (mock):', err);
      });
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      const { recordProfileSwipe } = await import('../services/supabaseMatching');
      await recordProfileSwipe(currentUser.id, userId, 'pass');
      await applySupabaseDiscoverState(
        set,
        get,
        state.rankedDiscoverPool,
        state.filters,
        currentUser.id,
        currentUser
      );
    } catch (e) {
      if (__DEV__) console.error('[MatchesStore] passUser supabase:', e);
      throw e;
    }
  },

  getCurrentMatch: (): Match | null => {
    const { availableMatches, currentMatchIndex } = get();
    if (
      availableMatches.length === 0 ||
      currentMatchIndex < 0 ||
      currentMatchIndex >= availableMatches.length
    ) {
      return null;
    }
    return availableMatches[currentMatchIndex] || null;
  },

  getLikedMatches: (): Match[] => get().getMatchesForTab(),

  getMatchesForTab: (): Match[] => {
    const s = get();
    if (s.discoverSwipeMode === 'supabase') {
      return s.mutualMatches;
    }
    if (s.likedUserIds.length === 0) return [];
    return s.rankedDiscoverPool.filter(
      (m) => m?.user?.id && s.likedUserIds.includes(m.user.id)
    );
  },

  unmatchUser: async (userId: string): Promise<void> => {
    const state = get();
    if (state.discoverSwipeMode === 'supabase') {
      const matchId = state.matchIdByPartnerUserId[userId];
      if (!matchId) return;
      try {
        const { deleteMutualMatchById } = await import('../services/supabaseMatching');
        await deleteMutualMatchById(matchId);
        const currentUser = getCurrentUser();
        if (currentUser) {
          await applySupabaseDiscoverState(
            set,
            get,
            state.rankedDiscoverPool,
            state.filters,
            currentUser.id,
            currentUser
          );
        }
      } catch (e) {
        if (__DEV__) console.error('[MatchesStore] unmatch:', e);
        throw e;
      }
      return;
    }

    if (!state.likedUserIds.includes(userId)) return;
    const newLikedUserIds = state.likedUserIds.filter((id) => id !== userId);
    const pruned = pruneExpiredPassSwipes(state.passedSwipes);
    const queue = buildDiscoverQueueFromPool(state.rankedDiscoverPool, newLikedUserIds, pruned);
    set({
      likedUserIds: newLikedUserIds,
      passedSwipes: pruned,
      availableMatches: queue,
      currentMatchIndex: 0,
    });
    saveMatchesState(newLikedUserIds, state.filters, pruned).catch((err) => {
      if (__DEV__) console.error('[MatchesStore] unmatch persist:', err);
    });
  },

  getConversationPreview: (userId: string): ConversationPreviewData => {
    const st = get();
    const previews = st._conversationPreviews ?? {};
    return previews[userId] ?? { lastMessage: '', unreadCount: 0 };
  },
  setConversationPreview: (userId: string, lastMessage: string, unreadCount = 0, lastMessageAt?: number): void => {
    const st = get();
    const previews = {
      ...(st._conversationPreviews ?? {}),
      [userId]: { lastMessage, unreadCount, lastMessageAt },
    };
    set({ _conversationPreviews: previews });
  },
  markConversationRead: (userId: string): void => {
    const st = get();
    const previews = st._conversationPreviews ?? {};
    const p = previews[userId];
    if (p) {
      set({ _conversationPreviews: { ...previews, [userId]: { ...p, unreadCount: 0 } } });
    }
  },

  reset: (): void => {
    set({
      discoverSwipeMode: 'supabase',
      rankedDiscoverPool: [],
      rankedDiscoverPoolLength: 0,
      availableMatches: [],
      likedUserIds: [],
      passedSwipes: [],
      swipedTargetIds: [],
      mutualMatches: [],
      matchIdByPartnerUserId: {},
      currentMatchIndex: 0,
      filters: {},
      error: null,
      isLoading: false,
      isHydrated: false,
    });
  },

  rehydrate: (likedUserIds: string[], filters: MatchFilters, passedSwipes: PassedSwipeRecord[] = []): void => {
    const pruned = pruneExpiredPassSwipes(passedSwipes);
    set({
      likedUserIds,
      filters,
      passedSwipes: pruned,
      isHydrated: true,
      isLoading: false,
      error: null,
    });
  },
}));
