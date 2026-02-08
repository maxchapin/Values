/**
 * Example Discover candidate for tests or Storybook.
 * Use to visually confirm gender label and card layout.
 */
import type { User } from '../types/user';

export const exampleDiscoverCandidate: User = {
  id: 'fixture-discover-1',
  email: 'jordan@example.com',
  name: 'Jordan',
  age: 28,
  gender: 'female',
  locationCoordinates: { latitude: 42.36, longitude: -71.06 },
  locationLabel: 'Cambridge, MA, USA',
  bio: 'Love hiking and good coffee. Looking for someone who values honesty and growth.',
  photos: ['https://picsum.photos/seed/fixture1/900/1200'],
  prompts: [
    { id: 'p1', question: "I'm looking for", answer: 'Someone who loves the outdoors', isCustom: false },
  ],
  selectedValues: [],
  createdAt: new Date().toISOString(),
};
