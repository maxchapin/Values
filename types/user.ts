/**
 * User profile domain types
 */

export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';

// Who the user wants to see (match preference)
export type InterestedIn = 'men' | 'women' | 'everyone';

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
  /** Free text: "Where are you from?" — informational only, not used for matching. */
  hometown?: string;
  job?: string;
  education?: string;
  bio: string;
  /** Profile photo URIs (local or remote). Max 4. */
  photos: string[];
  prompts: Prompt[]; // Dating app prompts and answers (like Hinge)
  selectedValues: string[]; // Array of value IDs
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
  hometown?: string;
  job?: string;
  education?: string;
  bio: string;
  photos: string[];
  prompts: Prompt[];
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
