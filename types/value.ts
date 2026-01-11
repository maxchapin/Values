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
