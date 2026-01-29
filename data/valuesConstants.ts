/**
 * Values Constants
 * Fixed list of values for the tiered values onboarding flow
 * All values initialized with tier: 'none'
 */

import { ValueItem } from '../types/value';

/**
 * Convert a label to a stable slug ID
 */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Fixed list of values for onboarding
 * Exact list provided, no duplicates, stable IDs
 */
const VALUES_LABELS = [
  'Privacy',
  'Rest',
  'Acceptance',
  'Risk',
  'Sensitivity',
  'Loyalty',
  'Tradition',
  'Fairness',
  'Well-being',
  'Laughter',
  'Commitment',
  'Experiment',
  'Balance',
  'Dependability',
  'Joy',
  'Fun',
  'Peace',
  'Presence',
  'Taking',
  'Accomplishment',
  'Cooperation',
  'Co-Creation',
  'Love',
  'Kindness',
  'Helpfulness',
  'Compassion',
  'Challenge',
  'Friendship',
  'Flexibility',
  'Authenticity',
  'Determination',
  'Alignment',
  'Participation',
  'Spirituality',
  'Leadership',
  'Happiness',
  'Nurturance',
  'Safety',
  'Equality',
  'Awareness',
  'Calm',
  'Warmth',
  'Consideration',
  'Freedom',
  'Wisdom',
  'Encouragement',
  'Humility',
  'Contribution',
  'Achievement',
  'Open-Minded',
  'Assertiveness',
  'Intimacy',
  'Diversity',
  'Collaboration',
  'Personal',
  'Altruism',
  'Simplicity',
  'Responsibility',
  'Celebration',
  'Growth',
  'Inspiration',
  'Connection',
  'Harmony',
  'Honesty',
  'Persistence',
  'Decisiveness',
  'Sexual',
  'Motivation',
  'Directness',
  'Economic',
  'Ease',
  'Expression',
  'Integrity',
  'Purpose',
  'Security',
  'Trust',
  'Success',
  'Wealth',
  'Health',
  'Family',
  'Affection',
  'Stability',
  'Community',
  'Spontaneity',
  'Respect',
  'Appreciation',
  'Adventure',
  'Expressiveness',
] as const;

/**
 * Create ValueItem array with all values initialized to tier: 'none'
 */
export const INITIAL_VALUES: ValueItem[] = VALUES_LABELS.map((label) => ({
  id: slugify(label),
  label,
  tier: 'none' as const,
}));
