/**
 * User profile domain types
 */

export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';

export interface Prompt {
  id: string;
  question: string;
  answer: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: Gender;
  location: string;
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
  name: string;
  age: number;
  gender: Gender;
  location: string;
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
