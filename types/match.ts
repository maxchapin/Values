/**
 * Match domain types
 */

import { User } from './user';

export interface Match {
  user: User;
  similarityScore: number; // 0-100
  sharedValues: string[]; // Array of shared value IDs
  sharedValuesCount: number;
}

export interface MatchFilters {
  minAge?: number;
  maxAge?: number;
  gender?: string[];
  location?: string;
  maxDistance?: number;
  minSharedValues?: number;
}
