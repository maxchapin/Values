/**
 * Storage utility module
 * Provides a typed interface for AsyncStorage operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys used throughout the app
 */
export const STORAGE_KEYS = {
  AUTH_STATE: '@Values:authState',
  USER_DATA: '@Values:userData',
  MATCHES_STATE: '@Values:matchesState',
  KEEP_SIGNED_IN: '@Values:keepSignedIn',
} as const;

/**
 * Auth state structure
 */
export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  keepSignedIn: boolean;
}

/**
 * Persisted user data structure
 */
export interface PersistedUserData {
  user: {
    id: string;
    email: string;
    name: string;
    age: number;
    gender: string;
    interestedIn?: string;
    location: string;
    hometown?: string;
    job?: string;
    education?: string;
    bio: string;
    photos: string[];
    // `isCustom` added later; keep optional for backward compatibility
    prompts: Array<{ id: string; question: string; answer: string; isCustom?: boolean }>;
    selectedValues: string[];
    createdAt: string;
    updatedAt?: string;
  };
  isProfileComplete: boolean;
  isValuesComplete: boolean;
}

/**
 * Persisted matches state
 */
export interface PersistedMatchesState {
  likedUserIds: string[];
  filters: {
    ageRange?: [number, number];
    location?: string;
    radiusKm?: number;
  };
}

/**
 * Save data to storage
 */
export async function saveToStorage<T>(key: string, data: T): Promise<void> {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
    if (__DEV__) {
      const preview = key === STORAGE_KEYS.AUTH_STATE 
        ? JSON.stringify(data, null, 2)
        : 'data saved';
      console.log(`[Storage] ✅ Saved data to ${key}:`, preview);
    }
  } catch (error) {
    if (__DEV__) {
      console.error(`[Storage] ❌ Error saving to ${key}:`, error);
    }
    throw error;
  }
}

/**
 * Load data from storage
 */
export async function loadFromStorage<T>(key: string): Promise<T | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue === null) {
      if (__DEV__) {
        console.log(`[Storage] No data found for ${key}`);
      }
      return null;
    }
    const data = JSON.parse(jsonValue) as T;
    if (__DEV__) {
      console.log(`[Storage] Loaded data from ${key}:`, key === STORAGE_KEYS.AUTH_STATE ? JSON.stringify(data, null, 2) : 'data loaded');
    }
    return data;
  } catch (error) {
    if (__DEV__) {
      console.error(`[Storage] Error loading from ${key}:`, error);
    }
    return null;
  }
}

/**
 * Remove data from storage
 */
export async function removeFromStorage(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    if (__DEV__) {
      console.log(`[Storage] Removed data from ${key}`);
    }
  } catch (error) {
    if (__DEV__) {
      console.error(`[Storage] Error removing ${key}:`, error);
    }
    throw error;
  }
}

/**
 * Clear all app storage
 */
export async function clearAllStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_STATE,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.MATCHES_STATE,
      STORAGE_KEYS.KEEP_SIGNED_IN,
    ]);
    if (__DEV__) {
      console.log('[Storage] Cleared all app storage');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[Storage] Error clearing storage:', error);
    }
    throw error;
  }
}
