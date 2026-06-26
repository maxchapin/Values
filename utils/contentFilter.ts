/**
 * Basic keyword filter for user-submitted text (chat messages, bio, prompt
 * answers). This is a first line of defense against the most obvious
 * objectionable content (Apple Guideline 1.2) — it is not a substitute for
 * the report/block flow, which remains the primary moderation mechanism.
 */

// Lowercase, no punctuation. Kept short and high-signal to avoid false
// positives on ordinary conversation; extend as needed.
const BLOCKED_TERMS: string[] = [
  // slurs (racial/ethnic/homophobic — most common variants)
  'nigger', 'nigga', 'chink', 'spic', 'kike', 'faggot', 'fag', 'tranny', 'retard',
  // sexual solicitation / explicit
  'onlyfans', 'sex for', 'nudes for', 'sugar daddy needed', 'escort service',
  'incall', 'outcall', 'cashapp for pics', 'venmo for pics',
  // explicit profanity (kept minimal — not a general swear filter)
  'cunt',
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns the first blocked term found in `text`, or null if none. */
export function findBlockedTerm(text: string | null | undefined): string | null {
  if (!text) return null;
  const normalized = ` ${normalize(text)} `;
  for (const term of BLOCKED_TERMS) {
    if (normalized.includes(` ${term} `) || normalized.includes(term.replace(/\s+/g, ''))) {
      return term;
    }
  }
  return null;
}

export function containsBlockedContent(text: string | null | undefined): boolean {
  return findBlockedTerm(text) !== null;
}
