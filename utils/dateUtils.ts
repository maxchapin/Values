/**
 * Date utilities for birthday and age handling.
 * Handles edge cases: birthday today (age 0), Feb 29, ISO strings.
 */

/**
 * Calculate age in full years from birthday.
 * Uses UTC date parts so "Jan 23" is consistent in all timezones.
 */
export function calculateAge(birthday: Date | string): number {
  const date = typeof birthday === 'string' ? new Date(birthday) : birthday;
  if (Number.isNaN(date.getTime())) return 0;
  const today = new Date();
  const birthY = date.getUTCFullYear();
  const birthM = date.getUTCMonth();
  const birthD = date.getUTCDate();
  let age = today.getUTCFullYear() - birthY;
  const monthDiff = today.getUTCMonth() - birthM;
  const dayDiff = today.getUTCDate() - birthD;
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Format birthday for display (e.g. "Jan 15, 1995" or "Select Birthday").
 * Uses UTC date parts so stored "Jan 23" displays as Jan 23 in all timezones.
 */
export function formatBirthdayDisplay(birthday: Date | string | null | undefined): string {
  if (birthday == null) return 'Select Birthday';
  const date = typeof birthday === 'string' ? new Date(birthday) : birthday;
  if (Number.isNaN(date.getTime())) return 'Select Birthday';
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  return new Date(y, m, d).toLocaleDateString(undefined, {
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
