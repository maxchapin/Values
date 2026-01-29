/**
 * Value domain types
 */

export interface Value {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface ValueCategory {
  id: string;
  name: string;
  values: Value[];
}

/**
 * Values selection flow steps
 */
export enum ValuesSelectionStep {
  INITIAL = 'initial', // Select any number
  NARROW_20 = 'narrow_20', // Must select exactly 20
  NARROW_10 = 'narrow_10', // Must select exactly 10
  FINAL_5 = 'final_5', // Must select exactly 5
  COMPLETE = 'complete',
}

/**
 * Tiered Values Data Model
 * New tiered "values cloud" concept for onboarding
 */

export type ValueTier = 'none' | 'initial' | 'top20' | 'top10' | 'top5';

export type ValuesOnboardingStep = 'broad' | 'top20' | 'top10' | 'top5' | 'summary';

export interface ValueItem {
  id: string;
  label: string;
  tier: ValueTier;
}
