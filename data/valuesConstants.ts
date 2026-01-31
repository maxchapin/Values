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
'Loyalty',
'Acceptance',
'Risk',
'Taking',
'Kindness',
'Flexibility',
'Spirituality',
'Equality',
'Freedom',
'Achievement',
'Collaboration',
'Celebration',
'Honesty',
'Directness',
'Purpose',
'Health',
'Spontaneity',
'Rest',
'Tradition',
'Commitment',
'Joy',
'Accomplishment',
'Helpfulness',
'Authenticity',
'Leadership',
'Awareness',
'Wisdom',
'Open-Minded',
'Personal',
'Growth',
'Persistence',
'Economic',
'Security',
'Family',
'Respect',
'Acceptance',
'Fairness',
'Experiment',
'Fun',
'Cooperation',
'Compassion',
'Determination',
'Happiness',
'Calm',
'Encouragement',
'Assertiveness',
'Altruism',
'Inspiration',
'Decisiveness',
'Ease',
'Trust',
'Affection',
'Appreciation',
'Risk',
'Well-being',
'Balance',
'Peace',
'Co-Creation',
'Challenge',
'Alignment',
'Nurturance',
'Warmth',
'Humility',
'Intimacy',
'Simplicity',
'Connection',
'Sexual',
'Expression',
'Success',
'Stability',
'Adventure',
'Sensitivity',
'Laughter',
'Dependability',
'Presence',
'Love',
'Friendship',
'Participation',
'Safety',
'Consideration',
'Contribution',
'Diversity',
'Responsibility',
'Harmony',
'Motivation',
'Integrity',
'Wealth',
'Community',
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
