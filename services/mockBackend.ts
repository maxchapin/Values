/**
 * Mock Backend Service
 * Simulates API calls for development
 * Pure functions - no React or Zustand dependencies
 * Can be easily swapped out for a real API later
 */

import { User, LocationCoordinates } from '../types/user';
import { Value } from '../types/value';
import { Match } from '../types/match';
import { EXAMPLE_VALUES } from '../data/values';

// Use values from data file
const PREDEFINED_VALUES: Value[] = EXAMPLE_VALUES;

/** Haversine distance in km between two points. */
function haversineKm(a: LocationCoordinates, b: LocationCoordinates): number {
  const R = 6371; // Earth radius km
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

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
    photos: ['https://picsum.photos/seed/values-u1/900/1200'],
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
    createdAt: '2024-01-15T10:00:00Z',
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
    photos: ['https://picsum.photos/seed/values-u2/900/1200'],
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
    createdAt: '2024-01-16T11:30:00Z',
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
    photos: ['https://picsum.photos/seed/values-u3/900/1200'],
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
    createdAt: '2024-01-17T14:20:00Z',
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
    photos: ['https://picsum.photos/seed/values-u4/900/1200'],
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
    createdAt: '2024-01-18T09:15:00Z',
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
    photos: ['https://picsum.photos/seed/values-u5/900/1200'],
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
    createdAt: '2024-01-19T16:45:00Z',
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
    photos: ['https://picsum.photos/seed/values-u6/900/1200'],
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
    createdAt: '2024-01-20T12:00:00Z',
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

/**
 * Calculate similarity score between two users based on shared values
 * Uses tiered values profile if available, falls back to legacy selectedValues
 * Prioritizes top 5 values, then top 10, then top 20, then initial
 * Returns a score from 0 to 1
 */
function calculateSimilarity(
  currentUser: User,
  otherUser: User
): { score: number; sharedValues: string[] } {
  // Use tiered values profile if available, otherwise fall back to legacy
  let currentTop5: string[] = [];
  let currentTop10: string[] = [];
  let currentTop20: string[] = [];
  let currentInitial: string[] = [];
  let currentAllValues: string[] = [];

  let otherTop5: string[] = [];
  let otherTop10: string[] = [];
  let otherTop20: string[] = [];
  let otherInitial: string[] = [];
  let otherAllValues: string[] = [];

  if (currentUser.valuesProfile) {
    // Use tiered values profile
    currentTop5 = currentUser.valuesProfile.top5Ids;
    currentTop10 = currentUser.valuesProfile.top10Ids;
    currentTop20 = currentUser.valuesProfile.top20Ids;
    currentInitial = currentUser.valuesProfile.initialIds;
    currentAllValues = currentUser.valuesProfile.allValues
      .filter((v) => v.tier !== 'none')
      .map((v) => v.id);
  } else {
    // Legacy: use selectedValues array (assume first 5 are top5, first 10 are top10, etc.)
    currentTop5 = currentUser.selectedValues.slice(0, 5);
    currentTop10 = currentUser.selectedValues.slice(0, 10);
    currentTop20 = currentUser.selectedValues.slice(0, 20);
    currentAllValues = currentUser.selectedValues;
  }

  if (otherUser.valuesProfile) {
    otherTop5 = otherUser.valuesProfile.top5Ids;
    otherTop10 = otherUser.valuesProfile.top10Ids;
    otherTop20 = otherUser.valuesProfile.top20Ids;
    otherInitial = otherUser.valuesProfile.initialIds;
    otherAllValues = otherUser.valuesProfile.allValues
      .filter((v) => v.tier !== 'none')
      .map((v) => v.id);
  } else {
    otherTop5 = otherUser.selectedValues.slice(0, 5);
    otherTop10 = otherUser.selectedValues.slice(0, 10);
    otherTop20 = otherUser.selectedValues.slice(0, 20);
    otherAllValues = otherUser.selectedValues;
  }

  // Get shared values at each tier
  const sharedTop5 = currentTop5.filter((v) => otherTop5.includes(v));
  const sharedTop10 = currentTop10.filter((v) => otherTop10.includes(v));
  const sharedTop20 = currentTop20.filter((v) => otherTop20.includes(v));
  const sharedInitial = currentInitial.filter((v) => otherInitial.includes(v));

  // Get all shared values (for return value)
  const sharedValues = currentAllValues.filter((v) => otherAllValues.includes(v));

  if (sharedValues.length === 0) {
    return { score: 0, sharedValues: [] };
  }

  // Weighted scoring based on tier importance:
  // - Top 5 matches: 0.6 weight each (max 3.0 points) - highest priority
  // - Top 10 matches (excluding top 5): 0.3 weight each (max 1.5 points)
  // - Top 20 matches (excluding top 10): 0.15 weight each (max 1.5 points)
  // - Initial matches (excluding top 20): 0.05 weight each
  // Normalize to 0-1 scale

  let score = 0;

  // Top 5 matches (highest priority)
  score += sharedTop5.length * 0.6;

  // Top 10 matches (excluding top 5)
  const sharedTop10Excluding5 = sharedTop10.filter((v) => !sharedTop5.includes(v));
  score += sharedTop10Excluding5.length * 0.3;

  // Top 20 matches (excluding top 10)
  const sharedTop20Excluding10 = sharedTop20.filter((v) => !sharedTop10.includes(v));
  score += sharedTop20Excluding10.length * 0.15;

  // Initial matches (excluding top 20)
  const sharedInitialExcluding20 = sharedInitial.filter((v) => !sharedTop20.includes(v));
  score += sharedInitialExcluding20.length * 0.05;

  // Normalize to 0-1 scale
  // Maximum possible score: 5*0.6 + 5*0.3 + 10*0.15 + (remaining)*0.05 ≈ 6.0
  const maxPossibleScore = 5 * 0.6 + 5 * 0.3 + 10 * 0.15 + 20 * 0.05; // 6.0
  const normalizedScore = Math.min(score / maxPossibleScore, 1);

  return {
    score: Math.round(normalizedScore * 100) / 100,
    sharedValues,
  };
}

/**
 * Find matches for a user
 * @param userId - The ID of the user to find matches for
 * @param filters - Optional filters for age range and distance (centerCoordinates + radiusKm)
 * @returns Promise of Match array sorted by similarity score
 */
export function findMatches(
  userId: string,
  filters?: {
    ageRange?: [number, number];
    centerCoordinates?: LocationCoordinates;
    radiusKm?: number;
  }
): Promise<Match[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const currentUser = MOCK_USERS.find((u) => u.id === userId);
      if (!currentUser) {
        resolve([]);
        return;
      }

      const center = filters?.centerCoordinates ?? currentUser.locationCoordinates;
      const radiusKm = typeof filters?.radiusKm === 'number' ? filters.radiusKm : 200;

      const matches: Match[] = MOCK_USERS.filter((user) => {
        // Don't match with self
        if (user.id === userId) return false;

        // Apply age range filter
        if (filters?.ageRange) {
          const [minAge, maxAge] = filters.ageRange;
          if (user.age < minAge || user.age > maxAge) return false;
        }

        // Apply distance filter using Haversine
        if (center && user.locationCoordinates) {
          const km = haversineKm(center, user.locationCoordinates);
          if (km > radiusKm) return false;
        }

        return true;
      }).map((user) => {
        const { score, sharedValues } = calculateSimilarity(
          currentUser,
          user
        );

        return {
          user,
          similarityScore: Math.round(score * 100), // Convert to 0-100 for display
          sharedValues,
          sharedValuesCount: sharedValues.length,
        };
      });

      // Sort by similarity score (descending)
      matches.sort((a, b) => b.similarityScore - a.similarityScore);

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
  const existing = MOCK_USERS.find((u) => u.id === user.id);
  if (existing) {
    Object.assign(existing, user);
    return;
  }

  MOCK_USERS.push(user);
}

/**
 * Create a new user
 */
export function createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newUser: User = {
        ...userData,
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
      const newUser: User = {
        id: resolvedId,
        email: profileData.email,
        name: profileData.name,
        age: profileData.age || 25,
        gender: profileData.gender || 'prefer-not-to-say',
        locationCoordinates: profileData.locationCoordinates ?? null,
        locationLabel: profileData.locationLabel ?? null,
        interestedIn: profileData.interestedIn,
        hometown: profileData.hometown,
        job: profileData.job,
        education: profileData.education,
        bio: profileData.bio || '',
        photos: profileData.photos || [],
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
