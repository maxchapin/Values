/**
 * Persistence Service
 * Handles saving and loading app state from storage
 */

import {
  STORAGE_KEYS,
  AuthState,
  PersistedUserData,
  PersistedMatchesState,
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
  clearAllStorage,
} from '../utils/storage';
import { User } from '../types/user';

/**
 * Save auth state to storage
 */
export async function saveAuthState(authState: AuthState): Promise<void> {
  if (__DEV__) {
    console.log('[Persistence] Saving auth state:', {
      isAuthenticated: authState.isAuthenticated,
      userId: authState.userId,
      keepSignedIn: authState.keepSignedIn,
    });
  }
  await saveToStorage<AuthState>(STORAGE_KEYS.AUTH_STATE, authState);
  if (__DEV__) {
    console.log('[Persistence] ✅ Auth state saved to storage');
  }
}

/**
 * Load auth state from storage
 */
export async function loadAuthState(): Promise<AuthState | null> {
  const authState = await loadFromStorage<AuthState>(STORAGE_KEYS.AUTH_STATE);
  if (__DEV__ && authState) {
    console.log('[Persistence] Loaded auth state from storage:', {
      isAuthenticated: authState.isAuthenticated,
      userId: authState.userId,
      keepSignedIn: authState.keepSignedIn,
    });
  } else if (__DEV__) {
    console.log('[Persistence] No auth state found in storage');
  }
  return authState;
}

/**
 * Save user data to storage
 */
export async function saveUserData(user: User, isProfileComplete: boolean, isValuesComplete: boolean): Promise<void> {
  const userData: PersistedUserData = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      age: user.age,
      birthday: user.birthday ?? undefined,
      gender: user.gender,
      interestedIn: user.interestedIn,
      locationCoordinates: user.locationCoordinates,
      locationLabel: user.locationLabel,
      neighborhood: user.neighborhood,
      hometown: user.hometown,
      job: user.job,
      education: user.education,
      bio: user.bio,
      photos: user.photos,
      prompts: user.prompts,
      selectedValues: user.selectedValues,
      valuesProfile: user.valuesProfile,
      settings: user.settings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    isProfileComplete,
    isValuesComplete,
  };
  await saveToStorage<PersistedUserData>(STORAGE_KEYS.USER_DATA, userData);
}

/**
 * Load user data from storage
 */
export async function loadUserData(): Promise<PersistedUserData | null> {
  return loadFromStorage<PersistedUserData>(STORAGE_KEYS.USER_DATA);
}

/**
 * Save matches state to storage
 */
export async function saveMatchesState(likedUserIds: string[], filters: PersistedMatchesState['filters']): Promise<void> {
  const matchesState: PersistedMatchesState = {
    likedUserIds,
    filters,
  };
  await saveToStorage<PersistedMatchesState>(STORAGE_KEYS.MATCHES_STATE, matchesState);
}

/**
 * Load matches state from storage
 */
export async function loadMatchesState(): Promise<PersistedMatchesState | null> {
  return loadFromStorage<PersistedMatchesState>(STORAGE_KEYS.MATCHES_STATE);
}

/**
 * Clear all persisted data (used on logout)
 */
export async function clearPersistedData(): Promise<void> {
  await clearAllStorage();
}

/**
 * Load all persisted app state
 * Returns null if no data exists or if data is corrupted
 */
export interface LoadedAppState {
  authState: AuthState | null;
  userData: PersistedUserData | null;
  matchesState: PersistedMatchesState | null;
}

export async function loadAllAppState(): Promise<LoadedAppState> {
  try {
    const [authState, userData, matchesState] = await Promise.all([
      loadAuthState(),
      loadUserData(),
      loadMatchesState(),
    ]);

    return {
      authState,
      userData,
      matchesState,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('[Persistence] Error loading app state:', error);
    }
    // Return empty state on error
    return {
      authState: null,
      userData: null,
      matchesState: null,
    };
  }
}

/**
 * Validate persisted user data structure
 */
export function validateUserData(data: unknown): data is PersistedUserData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const userData = data as Partial<PersistedUserData>;

  if (!userData.user || typeof userData.user !== 'object') {
    return false;
  }

  const user = userData.user;
  const requiredFields = ['id', 'email', 'name', 'age', 'gender', 'bio', 'photos', 'prompts', 'selectedValues', 'createdAt'];

  for (const field of requiredFields) {
    if (!(field in user)) {
      return false;
    }
  }

  // New shape: locationCoordinates + locationLabel. Old shape: location (string). Accept both.
  const hasNewLocation = 'locationCoordinates' in user && 'locationLabel' in user;
  const hasOldLocation = typeof (user as { location?: string }).location === 'string';
  if (!hasNewLocation && !hasOldLocation) {
    return false;
  }

  if (hasNewLocation) {
    const coords = (user as { locationCoordinates?: unknown }).locationCoordinates;
    const label = (user as { locationLabel?: unknown }).locationLabel;
    if (coords !== null && (typeof coords !== 'object' || typeof (coords as { latitude?: number }).latitude !== 'number' || typeof (coords as { longitude?: number }).longitude !== 'number')) {
      return false;
    }
    if (label !== null && typeof label !== 'string') {
      return false;
    }
  }

  // Validate types
  if (
    typeof user.id !== 'string' ||
    typeof user.name !== 'string' ||
    typeof user.age !== 'number' ||
    typeof user.gender !== 'string' ||
    typeof user.bio !== 'string' ||
    !Array.isArray(user.photos) ||
    !Array.isArray(user.prompts) ||
    !Array.isArray(user.selectedValues) ||
    typeof user.createdAt !== 'string'
  ) {
    return false;
  }
  if (!('email' in user) || typeof (user as { email?: string }).email !== 'string') {
    return false;
  }

  // Optional fields (defensive)
  if ('hometown' in user && user.hometown != null && typeof user.hometown !== 'string') {
    return false;
  }
  if ('interestedIn' in user && user.interestedIn != null && typeof user.interestedIn !== 'string') {
    return false;
  }

  return true;
}

/**
 * Validate persisted auth state structure
 */
export function validateAuthState(data: unknown): data is AuthState {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const authState = data as Partial<AuthState>;

  return (
    typeof authState.isAuthenticated === 'boolean' &&
    (authState.userId === null || typeof authState.userId === 'string') &&
    typeof authState.keepSignedIn === 'boolean'
  );
}
