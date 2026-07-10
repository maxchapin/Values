/**
 * Mock Backend Service
 * Simulates API calls for development
 * Pure functions - no React or Zustand dependencies
 * Can be easily swapped out for a real API later
 */

import { User, LocationCoordinates, UserValuesProfile, InterestedIn, Gender } from '../types/user';
import { Value } from '../types/value';
import { Match } from '../types/match';
import { INITIAL_VALUES } from '../data/valuesConstants';
import { haversineMiles } from '../utils/geo';
import {
  userToWeightMap,
  computeModel3Score,
  computeValuesExplanation,
} from './matchingModel';

/** Slugify label to match valuesConstants IDs */
function slug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Build a flat UserValuesProfile for mock users from an array of value labels. */
function buildValuesProfile(labels: string[]): UserValuesProfile {
  const selectedValueIds = labels.slice(0, 10).map(slug);
  const selectedValues = selectedValueIds
    .map((id) => {
      const found = INITIAL_VALUES.find((v) => v.id === id);
      return found ? { id: found.id, label: found.label } : null;
    })
    .filter((v): v is { id: string; label: string } => v !== null);
  return { selectedValueIds, selectedValues };
}

/** All values as Value[] for getAllValues (id, name from label, category). */
const PREDEFINED_VALUES: Value[] = INITIAL_VALUES.map((v) => ({
  id: v.id,
  name: v.label,
  category: 'Values',
}));

/** Default placeholder photos for new users (Profile/Preview testing when photos not set). */
const DEFAULT_USER_PHOTOS: string[] = [
  'https://picsum.photos/seed/me1/900/1200',
  'https://picsum.photos/seed/me2/900/1200',
  'https://picsum.photos/seed/me3/1200/800',
];

// Mock users database with realistic dating profiles (approximate city coords)
const MOCK_USERS: User[] = [
  {
    id: 'u1',
    email: 'alex@example.com',
    name: 'Alex',
    age: 28,
    gender: 'non-binary',
    locationCoordinates: { latitude: 40.7128, longitude: -74.006 },
    locationLabel: 'New York, NY, USA',
    bio: 'Love hiking, reading, and deep conversations. Looking for someone who values growth and adventure.',
    photos: [
      'https://picsum.photos/seed/u1a/900/1200',
      'https://picsum.photos/seed/u1b/900/1200',
      'https://picsum.photos/seed/u1c/1200/800',
    ],
    prompts: [
      {
        id: 'p1',
        question: 'I\'m looking for',
        answer: 'Someone who loves nature and meaningful conversations',
        isCustom: false,
      },
      {
        id: 'p2',
        question: 'My simple pleasures',
        answer: 'Morning coffee, sunset hikes, and a good book',
        isCustom: false,
      },
    ],
    selectedValues: ['v1', 'v5', 'v7', 'v14', 'v15', 'v19', 'v23', 'v25', 'v28', 'v32'],
    valuesProfile: buildValuesProfile(['Adventure', 'Growth', 'Connection', 'Well-being', 'Authenticity', 'Balance', 'Freedom', 'Joy', 'Peace', 'Honesty']),
    createdAt: '2024-01-15T10:00:00Z',
    lastLoginAt: lastLoginDaysAgo(1),
  },
  {
    id: 'u2',
    email: 'sam@example.com',
    name: 'Sam',
    age: 32,
    gender: 'male',
    locationCoordinates: { latitude: 37.7749, longitude: -122.4194 },
    locationLabel: 'San Francisco, CA, USA',
    bio: 'Tech enthusiast, coffee lover, and weekend adventurer. Passionate about sustainability and innovation.',
    photos: [
      'https://picsum.photos/seed/u2a/900/1200',
      'https://picsum.photos/seed/u2b/900/1200',
      'https://picsum.photos/seed/u2c/1200/800',
      'https://picsum.photos/seed/u2d/900/1200',
    ],
    prompts: [
      {
        id: 'p1',
        question: 'I\'m looking for',
        answer: 'A partner who shares my passion for tech and the environment',
        isCustom: false,
      },
      {
        id: 'p2',
        question: 'My simple pleasures',
        answer: 'Building side projects, trying new coffee shops, weekend hikes',
        isCustom: false,
      },
    ],
    selectedValues: ['v2', 'v10', 'v11', 'v13', 'v16', 'v17', 'v20', 'v22', 'v26', 'v31'],
    valuesProfile: buildValuesProfile(['Growth', 'Experiment', 'Balance', 'Cooperation', 'Achievement', 'Fairness', 'Freedom', 'Connection', 'Honesty', 'Integrity']),
    createdAt: '2024-01-16T11:30:00Z',
    lastLoginAt: lastLoginDaysAgo(5),
  },
  {
    id: 'u3',
    email: 'jordan@example.com',
    name: 'Jordan',
    age: 26,
    gender: 'female',
    locationCoordinates: { latitude: 30.2672, longitude: -97.7431 },
    locationLabel: 'Austin, TX, USA',
    bio: 'Yoga instructor, plant parent, and aspiring chef. I value mindfulness, wellness, and authentic connections.',
    photos: [
      'https://picsum.photos/seed/u3a/900/1200',
      'https://picsum.photos/seed/u3b/900/1200',
    ],
    prompts: [
      {
        id: 'p1',
        question: 'I\'m looking for',
        answer: 'Someone who values self-care and personal growth',
        isCustom: false,
      },
      {
        id: 'p2',
        question: 'My simple pleasures',
        answer: 'Morning yoga, cooking new recipes, tending to my plants',
        isCustom: false,
      },
    ],
    selectedValues: ['v3', 'v4', 'v6', 'v9', 'v14', 'v18', 'v23', 'v24', 'v27', 'v33'],
    valuesProfile: buildValuesProfile(['Well-being', 'Peace', 'Compassion', 'Awareness', 'Authenticity', 'Growth', 'Connection', 'Balance', 'Joy', 'Nurturance']),
    createdAt: '2024-01-17T14:20:00Z',
    lastLoginAt: lastLoginDaysAgo(0),
  },
  {
    id: 'u4',
    email: 'taylor@example.com',
    name: 'Taylor',
    age: 30,
    gender: 'female',
    locationCoordinates: { latitude: 47.6062, longitude: -122.3321 },
    locationLabel: 'Seattle, WA, USA',
    bio: 'Bookworm, nature photographer, and sustainability advocate. Looking for someone who cares about the planet and loves to read.',
    photos: [
      'https://picsum.photos/seed/u4a/900/1200',
      'https://picsum.photos/seed/u4b/1200/800',
      'https://picsum.photos/seed/u4c/900/1200',
    ],
    prompts: [
      {
        id: 'p1',
        question: 'I\'m looking for',
        answer: 'A fellow book lover who shares my environmental values',
        isCustom: false,
      },
      {
        id: 'p2',
        question: 'My simple pleasures',
        answer: 'Reading in coffee shops, capturing nature through my lens, farmers markets',
        isCustom: false,
      },
    ],
    selectedValues: ['v1', 'v2', 'v5', 'v7', 'v15', 'v17', 'v19', 'v25', 'v28', 'v34'],
    valuesProfile: buildValuesProfile(['Connection', 'Growth', 'Adventure', 'Honesty', 'Well-being', 'Balance', 'Peace', 'Family', 'Trust', 'Respect']),
    createdAt: '2024-01-18T09:15:00Z',
    lastLoginAt: lastLoginDaysAgo(7),
  },
  {
    id: 'u5',
    email: 'riley@example.com',
    name: 'Riley',
    age: 29,
    gender: 'male',
    locationCoordinates: { latitude: 45.5152, longitude: -122.6784 },
    locationLabel: 'Portland, OR, USA',
    bio: 'Musician, foodie, and community organizer. I believe in giving back and building strong connections.',
    photos: [
      'https://picsum.photos/seed/u5a/900/1200',
      'https://picsum.photos/seed/u5b/900/1200',
      'https://picsum.photos/seed/u5c/1200/800',
      'https://picsum.photos/seed/u5d/900/1200',
    ],
    prompts: [
      {
        id: 'p1',
        question: 'I\'m looking for',
        answer: 'Someone who values community and creativity',
        isCustom: false,
      },
      {
        id: 'p2',
        question: 'My simple pleasures',
        answer: 'Playing guitar, trying new restaurants, organizing community events',
        isCustom: false,
      },
    ],
    selectedValues: ['v6', 'v8', 'v12', 'v13', 'v16', 'v21', 'v22', 'v29', 'v30', 'v35'],
    valuesProfile: buildValuesProfile(['Community', 'Connection', 'Cooperation', 'Collaboration', 'Growth', 'Fun', 'Laughter', 'Adventure', 'Honesty', 'Authenticity']),
    createdAt: '2024-01-19T16:45:00Z',
    lastLoginAt: lastLoginDaysAgo(2),
  },
  {
    id: 'u6',
    email: 'morgan@example.com',
    name: 'Morgan',
    age: 27,
    gender: 'non-binary',
    locationCoordinates: { latitude: 39.7392, longitude: -104.9903 },
    locationLabel: 'Denver, CO, USA',
    bio: 'Outdoor enthusiast, artist, and social justice advocate. Looking for someone who shares my values and sense of adventure.',
    photos: [
      'https://picsum.photos/seed/u6a/900/1200',
      'https://picsum.photos/seed/u6b/900/1200',
    ],
    prompts: [
      {
        id: 'p1',
        question: 'I\'m looking for',
        answer: 'A partner who is passionate about social justice and loves the outdoors',
        isCustom: false,
      },
      {
        id: 'p2',
        question: 'My simple pleasures',
        answer: 'Rock climbing, painting, attending community events',
        isCustom: false,
      },
    ],
    selectedValues: ['v15', 'v20', 'v25', 'v26', 'v34', 'v35', 'v36', 'v37', 'v38', 'v39'],
    valuesProfile: buildValuesProfile(['Adventure', 'Freedom', 'Growth', 'Authenticity', 'Connection', 'Justice', 'Community', 'Fairness', 'Honesty', 'Determination']),
    createdAt: '2024-01-20T12:00:00Z',
    lastLoginAt: lastLoginDaysAgo(0),
  },
  // u7–u12: extra mock users so Discover has 12+ candidates and relaxation is rarely needed
  {
    id: 'u7',
    email: 'casey@example.com',
    name: 'Casey',
    age: 25,
    gender: 'female',
    interestedIn: 'men',
    locationCoordinates: { latitude: 40.7128, longitude: -74.006 },
    locationLabel: 'New York, NY, USA',
    bio: 'Artist and coffee enthusiast. I value creativity, connection, and kindness.',
    photos: [
      'https://picsum.photos/seed/u7a/900/1200',
      'https://picsum.photos/seed/u7b/900/1200',
      'https://picsum.photos/seed/u7c/1200/800',
    ],
    prompts: [
      { id: 'p1', question: 'I\'m looking for', answer: 'Someone creative and kind', isCustom: false },
      { id: 'p2', question: 'My simple pleasures', answer: 'Sketching, espresso, long walks', isCustom: false },
    ],
    selectedValues: [],
    valuesProfile: buildValuesProfile(['Connection', 'Kindness', 'Well-being', 'Growth', 'Authenticity', 'Creativity', 'Joy', 'Peace', 'Balance', 'Compassion']),
    createdAt: '2024-01-21T10:00:00Z',
    lastLoginAt: lastLoginDaysAgo(14),
  },
  {
    id: 'u8',
    email: 'quinn@example.com',
    name: 'Quinn',
    age: 31,
    gender: 'male',
    interestedIn: 'women',
    locationCoordinates: { latitude: 41.8781, longitude: -87.6298 },
    locationLabel: 'Chicago, IL, USA',
    bio: 'Software engineer who loves hiking and board games. Values honesty and growth.',
    photos: [
      'https://picsum.photos/seed/u8a/900/1200',
      'https://picsum.photos/seed/u8b/900/1200',
      'https://picsum.photos/seed/u8c/1200/800',
      'https://picsum.photos/seed/u8d/900/1200',
    ],
    prompts: [
      { id: 'p1', question: 'I\'m looking for', answer: 'A partner who values honesty and fun', isCustom: false },
      { id: 'p2', question: 'My simple pleasures', answer: 'Trails, game nights, good food', isCustom: false },
    ],
    selectedValues: [],
    valuesProfile: buildValuesProfile(['Honesty', 'Growth', 'Connection', 'Adventure', 'Balance', 'Fun', 'Achievement', 'Trust', 'Family', 'Well-being']),
    createdAt: '2024-01-22T11:00:00Z',
    lastLoginAt: lastLoginDaysAgo(10),
  },
  {
    id: 'u9',
    email: 'reese@example.com',
    name: 'Reese',
    age: 24,
    gender: 'non-binary',
    interestedIn: 'everyone',
    locationCoordinates: { latitude: 42.3601, longitude: -71.0589 },
    locationLabel: 'Boston, MA, USA',
    bio: 'Grad student and activist. Passionate about equality, community, and learning.',
    photos: [
      'https://picsum.photos/seed/u9a/900/1200',
      'https://picsum.photos/seed/u9b/900/1200',
    ],
    prompts: [
      { id: 'p1', question: 'I\'m looking for', answer: 'Someone who cares about justice and growth', isCustom: false },
      { id: 'p2', question: 'My simple pleasures', answer: 'Books, protests, tea with friends', isCustom: false },
    ],
    selectedValues: [],
    valuesProfile: buildValuesProfile(['Equality', 'Community', 'Growth', 'Honesty', 'Connection', 'Fairness', 'Freedom', 'Compassion', 'Authenticity', 'Respect']),
    createdAt: '2024-01-23T14:00:00Z',
    lastLoginAt: lastLoginDaysAgo(3),
  },
  {
    id: 'u10',
    email: 'skyler@example.com',
    name: 'Skyler',
    age: 29,
    gender: 'female',
    interestedIn: 'men',
    locationCoordinates: { latitude: 34.0522, longitude: -118.2437 },
    locationLabel: 'Los Angeles, CA, USA',
    bio: 'Yoga teacher and travel lover. I value peace, adventure, and authentic connections.',
    photos: [
      'https://picsum.photos/seed/u10a/900/1200',
      'https://picsum.photos/seed/u10b/1200/800',
      'https://picsum.photos/seed/u10c/900/1200',
    ],
    prompts: [
      { id: 'p1', question: 'I\'m looking for', answer: 'Someone calm and adventurous', isCustom: false },
      { id: 'p2', question: 'My simple pleasures', answer: 'Sunrise yoga, new places, deep talks', isCustom: false },
    ],
    selectedValues: [],
    valuesProfile: buildValuesProfile(['Peace', 'Adventure', 'Well-being', 'Connection', 'Authenticity', 'Balance', 'Growth', 'Joy', 'Freedom', 'Health']),
    createdAt: '2024-01-24T09:00:00Z',
    lastLoginAt: lastLoginDaysAgo(1),
  },
  {
    id: 'u11',
    email: 'jordan2@example.com',
    name: 'Jordan R.',
    age: 27,
    gender: 'male',
    interestedIn: 'women',
    locationCoordinates: { latitude: 39.7392, longitude: -104.9903 },
    locationLabel: 'Denver, CO, USA',
    bio: 'Outdoor guide and minimalist. Values simplicity, adventure, and honesty.',
    photos: [
      'https://picsum.photos/seed/u11a/900/1200',
      'https://picsum.photos/seed/u11b/900/1200',
      'https://picsum.photos/seed/u11c/1200/800',
      'https://picsum.photos/seed/u11d/900/1200',
    ],
    prompts: [
      { id: 'p1', question: 'I\'m looking for', answer: 'A partner who loves the outdoors and real talk', isCustom: false },
      { id: 'p2', question: 'My simple pleasures', answer: 'Summit views, campfires, starry skies', isCustom: false },
    ],
    selectedValues: [],
    valuesProfile: buildValuesProfile(['Adventure', 'Honesty', 'Simplicity', 'Well-being', 'Connection', 'Freedom', 'Growth', 'Authenticity', 'Balance', 'Peace']),
    createdAt: '2024-01-25T16:00:00Z',
    lastLoginAt: lastLoginDaysAgo(30),
  },
  {
    id: 'u12',
    email: 'avery@example.com',
    name: 'Avery',
    age: 33,
    gender: 'non-binary',
    interestedIn: 'everyone',
    locationCoordinates: { latitude: 37.7749, longitude: -122.4194 },
    locationLabel: 'San Francisco, CA, USA',
    bio: 'Designer and foodie. I value creativity, kindness, and growth.',
    photos: [
      'https://picsum.photos/seed/u12a/900/1200',
      'https://picsum.photos/seed/u12b/900/1200',
    ],
    prompts: [
      { id: 'p1', question: 'I\'m looking for', answer: 'Someone creative and kind', isCustom: false },
      { id: 'p2', question: 'My simple pleasures', answer: 'Design sprints, farmers markets, wine', isCustom: false },
    ],
    selectedValues: [],
    valuesProfile: buildValuesProfile(['Growth', 'Kindness', 'Connection', 'Well-being', 'Authenticity', 'Creativity', 'Adventure', 'Balance', 'Joy', 'Honesty']),
    createdAt: '2024-01-26T12:00:00Z',
    lastLoginAt: lastLoginDaysAgo(0),
  },
];

/**
 * Get all available values from the data file
 */
export function getAllValues(): Promise<Value[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...PREDEFINED_VALUES]);
    }, 300);
  });
}

/**
 * Get all mock users (for development/testing)
 */
export function getMockUsers(): Promise<User[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...MOCK_USERS]);
    }, 200);
  });
}

/** Fixed list of values for Model 3 (id + label). */
const FIXED_VALUES = INITIAL_VALUES.map((v) => ({ id: v.id, label: v.label }));

/**
 * Model 3: Mutual Importance Emphasis.
 * Returns match percentage (0–100), shared value IDs, and explanation buckets for UI.
 */
export function computeMatch(
  currentUser: User,
  otherUser: User
): {
  similarityScore: number;
  sharedValues: string[];
  valuesExplanation: import('../types/match').ValuesExplanation;
} {
  const weightMapA = userToWeightMap(currentUser, FIXED_VALUES);
  const weightMapB = userToWeightMap(otherUser, FIXED_VALUES);

  const { matchPercentage, sharedValueIds } = computeModel3Score(
    weightMapA,
    weightMapB,
    FIXED_VALUES
  );

  const valuesExplanation = computeValuesExplanation(
    weightMapA,
    weightMapB,
    FIXED_VALUES
  );

  return {
    similarityScore: Math.round(matchPercentage),
    sharedValues: sharedValueIds,
    valuesExplanation,
  };
}

/** Default radius (miles) for mock mode when not specified. */
const DEFAULT_RADIUS_MILES = 50;

/** Returns an ISO string for "n days ago" (used for mock lastLoginAt variety). */
function lastLoginDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Relaxed radius (miles) used when strict filters yield 0 candidates (mock-only fallback). */
const RELAXED_RADIUS_MILES = 2500;

/** Composite score: recency window (days). After this many days since last login, recencyScore = 0. */
const RECENCY_WINDOW_DAYS = 14;
/** Weight for similarity (values match) in composite score. */
const W_SIMILARITY = 0.7;
/** Weight for recency (last login) in composite score. */
const W_RECENCY = 0.3;

/**
 * Recency score 0–100 from last login. Linear decay over RECENCY_WINDOW_DAYS.
 * No lastLoginAt or invalid date → 0.
 */
function getRecencyScore(lastLoginAt: string | null | undefined): number {
  if (!lastLoginAt || typeof lastLoginAt !== 'string') return 0;
  const t = (Date.now() - new Date(lastLoginAt).getTime()) / (24 * 60 * 60 * 1000); // days since
  if (t < 0) return 100; // future date → treat as just now
  if (t >= RECENCY_WINDOW_DAYS) return 0;
  return Math.max(0, 100 * (1 - t / RECENCY_WINDOW_DAYS));
}

/**
 * Composite score for Discover ordering: blend similarity (values match) and recency (last login).
 * compositeScore = W_SIMILARITY * similarityScore + W_RECENCY * recencyScore (both 0–100).
 */
function getCompositeScore(similarityScore: number, recencyScore: number): number {
  return W_SIMILARITY * similarityScore + W_RECENCY * recencyScore;
}

/**
 * Returns true if the candidate's gender matches the viewer's "interested in" preference.
 * Used to filter Discover candidates so users only see genders they're interested in.
 */
function matchesInterestedIn(viewerInterestedIn: InterestedIn | undefined, candidateGender: Gender): boolean {
  if (!viewerInterestedIn || viewerInterestedIn === 'everyone') return true;
  if (viewerInterestedIn === 'men') return candidateGender === 'male';
  if (viewerInterestedIn === 'women') return candidateGender === 'female';
  return true;
}

/**
 * Apply filters and build Match[] for a user. Used for strict pass and relaxed fallback.
 * All distances in miles.
 */
function buildMatchesForUser(
  currentUser: User,
  candidates: User[],
  opts: {
    ageRange?: [number, number];
    center: LocationCoordinates | null;
    radiusMiles: number;
  }
): Match[] {
  const { ageRange, center, radiusMiles } = opts;

  return candidates
    .filter((user) => {
      if (user.id === currentUser.id) return false;
      if (Array.isArray(ageRange) && ageRange.length === 2) {
        const [minAge, maxAge] = ageRange;
        if (user.age < minAge || user.age > maxAge) return false;
      }
      if (center && user.locationCoordinates) {
        const miles = haversineMiles(center, user.locationCoordinates);
        if (miles == null || miles > radiusMiles) return false;
      }
      return true;
    })
    .map((user) => {
      const { similarityScore, sharedValues, valuesExplanation } = computeMatch(
        currentUser,
        user
      );
      const recencyScore = getRecencyScore(user.lastLoginAt ?? null);
      const compositeScore = getCompositeScore(similarityScore, recencyScore);
      const distanceMiles =
        center && user.locationCoordinates
          ? haversineMiles(center, user.locationCoordinates)
          : null;
      const match: Match = {
        user,
        similarityScore,
        sharedValues,
        sharedValuesCount: sharedValues.length,
        valuesExplanation,
        distanceMiles: distanceMiles ?? undefined,
      };
      return { match, compositeScore };
    })
    .sort((a, b) => {
      const c = b.compositeScore - a.compositeScore;
      if (c !== 0) return c;
      const da = a.match.distanceMiles;
      const db = b.match.distanceMiles;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    })
    .map(({ match }) => match);
}

export interface DiscoverMatchFilters {
  ageRange?: [number, number];
  centerCoordinates?: LocationCoordinates;
  radiusMiles?: number;
  /** Viewer's "interested in" preference; used to filter candidates by gender. Falls back to currentUser.interestedIn if not provided. */
  interestedIn?: InterestedIn;
}

/**
 * Build ordered Discover matches from a pool of candidate users (e.g. Supabase rows or mock users).
 * When `applyRelaxedFallback` is true (development), widens age/radius if strict filters yield no one — still only real candidates from `pool`.
 */
export function buildMatchListForDiscover(
  currentUser: User,
  pool: User[],
  filters?: DiscoverMatchFilters,
  options?: { applyRelaxedFallback?: boolean }
): Match[] {
  const center = filters?.centerCoordinates ?? currentUser.locationCoordinates ?? null;
  const radiusMiles =
    typeof filters?.radiusMiles === 'number' ? filters.radiusMiles : DEFAULT_RADIUS_MILES;
  const ageRange = filters?.ageRange;
  const interestedIn = filters?.interestedIn ?? currentUser.interestedIn;
  const applyRelaxedFallback = options?.applyRelaxedFallback === true;

  const allCandidates = pool.filter((u) => u.id !== currentUser.id);
  const candidates = interestedIn
    ? allCandidates.filter((u) => matchesInterestedIn(interestedIn, u.gender))
    : allCandidates;

  let matches = buildMatchesForUser(currentUser, candidates, {
    ageRange,
    center,
    radiusMiles,
  });

  if (applyRelaxedFallback && matches.length === 0 && candidates.length > 0) {
    const relaxedAge: [number, number] = [18, 99];
    const relaxedRadius = Math.max(radiusMiles, RELAXED_RADIUS_MILES);
    matches = buildMatchesForUser(currentUser, candidates, {
      ageRange: relaxedAge,
      center,
      radiusMiles: relaxedRadius,
    });
  }

  return matches;
}

/**
 * Find matches for a user (in-memory mock users only).
 * All distances in miles. Respects viewer's interestedIn (men/women/everyone).
 * Development: if strict filters yield 0 candidates, retries with relaxed radius so Discover is never empty when using mock data.
 */
export function findMatches(
  userId: string,
  filters?: DiscoverMatchFilters
): Promise<Match[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const currentUser = MOCK_USERS.find((u) => u.id === userId);
      if (!currentUser) {
        resolve([]);
        return;
      }

      const matches = buildMatchListForDiscover(currentUser, MOCK_USERS, filters, {
        applyRelaxedFallback: true,
      });

      resolve(matches);
    }, 500);
  });
}

/**
 * Get a user by ID
 */
export function getUserById(userId: string): Promise<User | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = MOCK_USERS.find((u) => u.id === userId);
      resolve(user || null);
    }, 200);
  });
}

/**
 * Upsert a user into the in-memory mock DB.
 * Important for cold starts: persisted users (e.g. u8) won't exist in MOCK_USERS
 * unless we add them back in.
 */
export function upsertMockUser(user: User): void {
  const lastLoginAt = new Date().toISOString(); // so this user surfaces as "recently active" in others' Discover
  const existing = MOCK_USERS.find((u) => u.id === user.id);
  if (existing) {
    Object.assign(existing, user, { lastLoginAt });
    return;
  }

  MOCK_USERS.push({ ...user, lastLoginAt });
}

/**
 * Create a new user
 */
export function createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const photos =
        userData.photos && userData.photos.length > 0
          ? userData.photos.slice(0, 4)
          : DEFAULT_USER_PHOTOS;
      const newUser: User = {
        ...userData,
        photos,
        id: `u${MOCK_USERS.length + 1}`,
        createdAt: new Date().toISOString(),
      };
      MOCK_USERS.push(newUser);
      resolve(newUser);
    }, 400);
  });
}

/**
 * Create or update user profile
 * If user exists, updates profile; otherwise creates new user
 */
export function createOrUpdateUser(
  userId: string | null,
  profileData: Partial<User> & { email: string; name: string }
): Promise<User> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (userId) {
        // Update existing user
        const user = MOCK_USERS.find((u) => u.id === userId);
        if (user) {
          Object.assign(user, profileData, {
            updatedAt: new Date().toISOString(),
          });
          resolve(user);
          return;
        }
      }

      // Create new user
      // If a userId was provided but not found, preserve that id to keep persistence consistent.
      const resolvedId = userId ?? `u${MOCK_USERS.length + 1}`;
      const photos =
        profileData.photos && profileData.photos.length > 0
          ? profileData.photos.slice(0, 4)
          : DEFAULT_USER_PHOTOS;
      const newUser: User = {
        id: resolvedId,
        email: profileData.email,
        name: profileData.name,
        age: profileData.age ?? 25,
        birthday: profileData.birthday ?? undefined,
        gender: profileData.gender || 'prefer-not-to-say',
        locationCoordinates: profileData.locationCoordinates ?? null,
        locationLabel: profileData.locationLabel ?? null,
        neighborhood: profileData.neighborhood ?? null,
        interestedIn: profileData.interestedIn,
        hometown: profileData.hometown,
        job: profileData.job,
        education: profileData.education,
        bio: profileData.bio || '',
        photos,
        prompts: profileData.prompts || [],
        selectedValues: profileData.selectedValues || [],
        createdAt: new Date().toISOString(),
      };
      MOCK_USERS.push(newUser);
      resolve(newUser);
    }, 400);
  });
}

/**
 * Update user's selected values
 */
export function updateUserValues(userId: string, values: string[]): Promise<User | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = MOCK_USERS.find((u) => u.id === userId);
      if (user) {
        user.selectedValues = values;
        user.updatedAt = new Date().toISOString();
        resolve(user);
      } else {
        resolve(null);
      }
    }, 300);
  });
}

/**
 * Update a user (full user object)
 */
export function updateUser(updatedUser: User): Promise<User | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = MOCK_USERS.find((u) => u.id === updatedUser.id);
      if (user) {
        Object.assign(user, updatedUser);
        user.updatedAt = new Date().toISOString();
        resolve(user);
      } else {
        resolve(null);
      }
    }, 300);
  });
}
