/**
 * Model 3: Mutual Importance Emphasis
 * Value weights, scoring, and human-readable explanation for match calculations.
 * Uses the fixed list from valuesConstants (90 values, slug ids).
 */

import { User } from '../types/user';
import type { ValuesExplanation } from '../types/match';

/** Fixed list entry: id (slug from valuesConstants) and label for explanation copy. */
export interface FixedValue {
  id: string;
  label: string;
}

/**
 * Build a binary weight map (1 = selected, 0 = not selected) for a user.
 * Uses flat selectedValueIds from valuesProfile; falls back to legacy selectedValues array.
 */
export function userToWeightMap(user: User, fixedValues: FixedValue[]): Map<string, number> {
  const map = new Map<string, number>();

  // New flat model
  if (user.valuesProfile?.selectedValueIds && user.valuesProfile.selectedValueIds.length > 0) {
    const selected = new Set(user.valuesProfile.selectedValueIds);
    for (const f of fixedValues) {
      map.set(f.id, selected.has(f.id) ? 1 : 0);
    }
    return map;
  }

  // Legacy fallback: selectedValues string array
  const ids = new Set(user.selectedValues ?? []);
  for (const f of fixedValues) {
    map.set(f.id, ids.has(f.id) ? 1 : 0);
  }
  return map;
}

/** Binary score: 1 if both selected, 0 otherwise. */
function valueScore(weightA: number, weightB: number): number {
  return Math.min(weightA, weightB);
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
 * Bucket shared values into alignment buckets.
 * With binary weights: strongAlignment = both selected; partialOverlap and potentialFriction unused.
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
    if (wA >= 1 && wB >= 1) {
      strongAlignment.push(label);
    }
  }

  return { strongAlignment, partialOverlap, potentialFriction };
}

/**
 * Format explanation buckets into short copy lines for UI.
 */
export function formatExplanationLines(explanation: ValuesExplanation): string[] {
  const lines: string[] = [];
  const strongAlignment = explanation?.strongAlignment ?? [];
  const partialOverlap = explanation?.partialOverlap ?? [];
  const potentialFriction = explanation?.potentialFriction ?? [];

  if (strongAlignment.length > 0) {
    const list = formatList(strongAlignment);
    lines.push(`You both strongly prioritize ${list}.`);
  }
  if (partialOverlap.length > 0) {
    const list = formatList(partialOverlap);
    lines.push(`You share an interest in ${list}.`);
  }
  if (potentialFriction.length > 0) {
    const list = formatList(potentialFriction);
    lines.push(`You have differing priorities around ${list}.`);
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

/**
 * One-line explanation for compact UI: 🟢 Strong values or 🟡 Partial, truncated.
 */
export function formatExplanationOneLine(
  explanation: ValuesExplanation,
  maxChars = 36
): string {
  const strong = (explanation?.strongAlignment ?? []).slice(0, 3).join(', ');
  const partial = (explanation?.partialOverlap ?? []).slice(0, 3).join(', ');
  if (strong && partial) {
    const s = `🟢 ${strong}  🟡 ${partial}`;
    return s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s;
  }
  if (strong) {
    const s = `🟢 ${strong}`;
    return s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s;
  }
  if (partial) {
    const s = `🟡 ${partial}`;
    return s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s;
  }
  return '';
}
