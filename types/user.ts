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

export interface User {
  id: string;
  email: string;
  name: string; // First name
  age: number;
  gender: Gender;
  interestedIn?: InterestedIn; // "I am interested in"
  location: string;
  hometown?: string; // "Where are you from?"
  job?: string;
  education?: string;
  bio: string;
  photos: string[]; // URLs or local paths
  prompts: Prompt[]; // Dating app prompts and answers (like Hinge)
  selectedValues: string[]; // Array of value IDs
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile {
  name: string; // First name
  age: number;
  gender: Gender;
  interestedIn?: InterestedIn;
  location: string;
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
  location?: string;
  maxDistance?: number; // in km
  minSharedValues?: number;
}
