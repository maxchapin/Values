/**
 * Model 3: Mutual Importance Emphasis
 * Value weights, scoring, and human-readable explanation for match calculations.
 * Uses the fixed list from valuesConstants (90 values, slug ids).
 */

import { User } from '../types/user';
import type { ValuesExplanation } from '../types/match';

/** Tier → numeric weight (none=0 … top5=4). */
const TIER_WEIGHT: Record<string, number> = {
  none: 0,
  initial: 1,
  top20: 2,
  top10: 3,
  top5: 4,
};

/** Fixed list entry: id (slug from valuesConstants) and label for explanation copy. */
export interface FixedValue {
  id: string;
  label: string;
}

/**
 * Build a map of valueId → weight for a user.
 * Uses valuesProfile (slug ids from valuesConstants) if available; otherwise legacy selectedValues.
 */
export function userToWeightMap(user: User, fixedValues: FixedValue[]): Map<string, number> {
  const map = new Map<string, number>();

  if (user.valuesProfile?.allValues && user.valuesProfile.allValues.length > 0) {
    for (const v of user.valuesProfile.allValues) {
      const w = TIER_WEIGHT[v.tier] ?? 0;
      map.set(v.id, w);
    }
    for (const f of fixedValues) {
      if (!map.has(f.id)) map.set(f.id, 0);
    }
    return map;
  }

  // Legacy: selectedValues (e.g. slug ids or v1, v2); first 5=top5, next 5=top10, next 10=top20, rest=initial
  const ids = user.selectedValues ?? [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    let tier: keyof typeof TIER_WEIGHT = 'initial';
    if (i < 5) tier = 'top5';
    else if (i < 10) tier = 'top10';
    else if (i < 20) tier = 'top20';
    map.set(id, TIER_WEIGHT[tier] ?? 1);
  }
  for (const f of fixedValues) {
    if (!map.has(f.id)) map.set(f.id, 0);
  }
  return map;
}

/**
 * Model 3 score for one value (per spec):
 *   base = min(weightA, weightB)
 *   boost = 1.5 if (weightA === weightB && weightA >= 3), else 1
 *   valueScore = base * boost
 */
function valueScore(weightA: number, weightB: number): number {
  const base = Math.min(weightA, weightB);
  const boost =
    weightA === weightB && weightA >= 3 ? 1.5 : 1;
  return base * boost;
}

/**
 * Compute Model 3 total score and match percentage.
 * maxPossibleScore = sum over values of "best possible for this pair" (valueScore(max(wA,wB), max(wA,wB))).
 */
export function computeModel3Score(
  weightMapA: Map<string, number>,
  weightMapB: Map<string, number>,
  fixedValues: FixedValue[]
): {
  actualScore: number;
  maxPossibleScore: number;
  matchPercentage: number;
  sharedValueIds: string[];
} {
  let actualScore = 0;
  let maxPossibleScore = 0;
  const sharedValueIds: string[] = [];

  for (const { id } of fixedValues) {
    const wA = weightMapA.get(id) ?? 0;
    const wB = weightMapB.get(id) ?? 0;
    const best = Math.max(wA, wB);
    actualScore += valueScore(wA, wB);
    maxPossibleScore += valueScore(best, best);
    if (Math.min(wA, wB) >= 1) sharedValueIds.push(id);
  }

  const rawPercentage = maxPossibleScore > 0 ? (actualScore / maxPossibleScore) * 100 : 0;
  const matchPercentage = Math.min(100, Math.max(0, rawPercentage));

  return {
    actualScore,
    maxPossibleScore,
    matchPercentage,
    sharedValueIds,
  };
}

/**
 * Bucket values into strong alignment, partial overlap, and potential friction.
 */
export function computeValuesExplanation(
  weightMapA: Map<string, number>,
  weightMapB: Map<string, number>,
  fixedValues: FixedValue[]
): ValuesExplanation {
  const strongAlignment: string[] = [];
  const partialOverlap: string[] = [];
  const potentialFriction: string[] = [];

  for (const { id, label } of fixedValues) {
    const wA = weightMapA.get(id) ?? 0;
    const wB = weightMapB.get(id) ?? 0;

    if (wA === wB && wA >= 3) {
      strongAlignment.push(label);
      continue;
    }
    if ((wA >= 3 && wB <= 1) || (wB >= 3 && wA <= 1)) {
      potentialFriction.push(label);
      continue;
    }
    if (Math.min(wA, wB) >= 1) {
      partialOverlap.push(label);
    }
  }

  return {
    strongAlignment,
    partialOverlap,
    potentialFriction,
  };
}

/**
 * Format explanation buckets into short copy lines for UI.
 */
export function formatExplanationLines(explanation: ValuesExplanation): string[] {
  const lines: string[] = [];

  if (explanation.strongAlignment.length > 0) {
    const list = formatList(explanation.strongAlignment);
    lines.push(`You both strongly prioritize ${list}.`);
  }
  if (explanation.partialOverlap.length > 0) {
    const list = formatList(explanation.partialOverlap);
    lines.push(`You're aligned on ${list}, but at different levels.`);
  }
  if (explanation.potentialFriction.length > 0) {
    const list = formatList(explanation.potentialFriction);
    lines.push(`You have different priorities around ${list}.`);
  }

  return lines;
}

function formatList(labels: string[], max = 5): string {
  const show = labels.slice(0, max);
  if (show.length === 0) return '';
  if (show.length === 1) return show[0];
  if (show.length === 2) return `${show[0]} and ${show[1]}`;
  const last = show[show.length - 1];
  const rest = show.slice(0, -1).join(', ');
  return `${rest} and ${last}`;
}
