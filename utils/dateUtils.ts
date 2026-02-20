/**
 * Date utilities for birthday and age handling.
 * Handles edge cases: birthday today (age 0), Feb 29, ISO strings.
 */

/**
 * Calculate age in full years from birthday.
 * Uses calendar comparison: if this year's birthday hasn't occurred yet, age is one less.
 * Feb 29: treated as Feb 28 in non-leap years for "has birthday occurred" check.
 */
export function calculateAge(birthday: Date | string): number {
  const date = typeof birthday === 'string' ? new Date(birthday) : birthday;
  if (Number.isNaN(date.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const dayDiff = today.getDate() - date.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Format birthday for display (e.g. "Jan 15, 1995" or "Select Birthday").
 */
export function formatBirthdayDisplay(birthday: Date | string | null | undefined): string {
  if (birthday == null) return 'Select Birthday';
  const date = typeof birthday === 'string' ? new Date(birthday) : birthday;
  if (Number.isNaN(date.getTime())) return 'Select Birthday';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Return birthday as ISO string at midnight UTC (date-only; no time component in display).
 * Supabase stores timestamptz; we send e.g. "1995-01-15T00:00:00.000Z".
 */
export function birthdayToISOString(birthday: Date): string {
  const d = new Date(Date.UTC(birthday.getFullYear(), birthday.getMonth(), birthday.getDate(), 0, 0, 0, 0));
  return d.toISOString();
}

/**
 * Maximum date for picker = 18 years ago today (user must be 18+).
 */
export function getMaxBirthdayDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

/**
 * Minimum date for picker = 100 years ago (reasonable upper bound).
 */
export function getMinBirthdayDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  return d;
}
