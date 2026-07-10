/**
 * Match domain types
 */

import { User } from './user';

/** Human-readable explanation buckets (value labels for UI copy). */
export interface ValuesExplanation {
  /** Values where both users have same high priority (top10/top5). Copy: "You both strongly prioritize X and Y." */
  strongAlignment: string[];
  /** Values with some overlap but different tiers. Copy: "You're aligned on X and Y, but at different levels." */
  partialOverlap: string[];
  /** One user high priority, other low/none. Copy: "You have different priorities around X and Y." */
  potentialFriction: string[];
}

export interface Match {
  user: User;
  /** Match percentage 0–100 from Model 3 (Mutual Importance Emphasis). */
  similarityScore: number;
  sharedValues: string[]; // Value IDs where both have at least some priority (min weight >= 1)
  sharedValuesCount: number;
  /** Explanation buckets for UI; never expose math/tiers to user. */
  valuesExplanation?: ValuesExplanation;
  /** Distance in miles from viewer to this match (when center coords available). Omitted if unavailable. */
  distanceMiles?: number | null;
  /** Most recent venue both users have checked into. Populated from get_checkin_feed. */
  sharedVenueName?: string;
}

export interface MatchFilters {
  minAge?: number;
  maxAge?: number;
  gender?: string[];
  location?: string;
  maxDistance?: number;
  minSharedValues?: number;
}
