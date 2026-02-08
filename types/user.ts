/**
 * User profile domain types
 */

export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';

/**
 * Gender values as stored in Supabase `profiles.gender`.
 * Use for DB reads/writes and display labels (Man, Woman, Nonbinary).
 */
export type ProfileGender = 'man' | 'woman' | 'nonbinary' | null;

// Who the user wants to see (match preference)
export type InterestedIn = 'men' | 'women' | 'everyone';

/**
 * Supabase profiles table row shape.
 * Use for type-safe selects; gender matches DB enum/value.
 */
export interface Profile {
  id: string;
  gender: ProfileGender;
  /** Neighborhood/area name (e.g. "Harvard Square"); visible to all. */
  neighborhood?: string | null;
  /** Other fields omitted here; use SupabaseProfile for full row. */
}

export interface Prompt {
  id: string;
  question: string;
  answer: string;
  isCustom: boolean;
}

/** Coordinates from map picker; used for distance matching. */
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface User {
  id: string;
  email: string;
  name: string; // First name
  age: number;
  gender: Gender;
  interestedIn?: InterestedIn; // "I am interested in"
  /** Map-picked coordinates; used for filters/matching. */
  locationCoordinates: LocationCoordinates | null;
  /** Human-readable label from reverse geocoding (e.g. "Cambridge, MA, USA"). */
  locationLabel: string | null;
  /** Neighborhood/area name (e.g. "Harvard Square", "Central Square"); visible to all, optional. */
  neighborhood?: string | null;
  /** Free text: "Where are you from?" — informational only, optional. */
  hometown?: string;
  job?: string;
  education?: string;
  bio: string;
  /** Profile photo URIs (local or remote). Max 4. */
  photos: string[];
  prompts: Prompt[]; // Dating app prompts and answers (like Hinge)
  selectedValues: string[]; // Array of value IDs (legacy - kept for backward compatibility)
  valuesProfile?: UserValuesProfile; // Tiered values profile (new)
  settings?: UserSettings; // User preferences and settings
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  interestedIn?: InterestedIn;
  locationCoordinates: LocationCoordinates | null;
  locationLabel: string | null;
  neighborhood?: string | null;
  hometown?: string;
  job?: string;
  education?: string;
  bio: string;
  photos: string[];
  prompts: Prompt[];
}

/**
 * User values profile with tier information
 */
export interface UserValuesProfile {
  allValues: Array<{
    id: string;
    label: string;
    tier: 'none' | 'initial' | 'top20' | 'top10' | 'top5';
  }>;
  top5Ids: string[];
  top10Ids: string[];
  top20Ids: string[];
  initialIds: string[];
}

export interface UserFilters {
  minAge?: number;
  maxAge?: number;
  gender?: Gender[];
  /** Center for distance filter; typically from current user's locationCoordinates. */
  centerCoordinates?: LocationCoordinates;
  /** Radius in km for distance matching. */
  radiusKm?: number;
  minSharedValues?: number;
}

/**
 * User settings/preferences
 */
export interface UserSettings {
  /** Whether profile is visible to others in Discover */
  isProfileVisible: boolean;
  /** Notification preferences (push notifications) */
  notifications: {
    newMatch: boolean;
    newMessage: boolean;
  };
}
