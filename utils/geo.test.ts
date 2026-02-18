/**
 * Unit tests for geographic distance utilities.
 * Run with: npm test (requires jest and jest-expo).
 */
import { haversineMiles, formatDistanceMiles } from './geo';

describe('haversineMiles', () => {
  it('returns 0 for same point', () => {
    const point = { latitude: 42.36, longitude: -71.06 };
    expect(haversineMiles(point, point)).toBe(0);
  });

  it('returns null when first point is null', () => {
    expect(haversineMiles(null, { latitude: 42, longitude: -71 })).toBeNull();
  });

  it('returns null when second point is null', () => {
    expect(haversineMiles({ latitude: 42, longitude: -71 }, null)).toBeNull();
  });

  it('returns null when first point is undefined', () => {
    expect(haversineMiles(undefined, { latitude: 42, longitude: -71 })).toBeNull();
  });

  it('returns null when coordinates are invalid (NaN)', () => {
    expect(haversineMiles(
      { latitude: NaN, longitude: -71 },
      { latitude: 42, longitude: -71 }
    )).toBeNull();
    expect(haversineMiles(
      { latitude: 42, longitude: -71 },
      { latitude: 42, longitude: Infinity }
    )).toBeNull();
  });

  it('computes approximate distance between NYC and Boston', () => {
    // New York City (approx)
    const nyc = { latitude: 40.7128, longitude: -74.006 };
    // Boston (approx)
    const boston = { latitude: 42.3601, longitude: -71.0589 };
    const miles = haversineMiles(nyc, boston);
    expect(miles).not.toBeNull();
    // Actual driving distance ~215 mi; great-circle is shorter, roughly 190–210 mi
    expect((miles as number)).toBeGreaterThan(180);
    expect((miles as number)).toBeLessThan(220);
  });

  it('is symmetric', () => {
    const a = { latitude: 40.7128, longitude: -74.006 };
    const b = { latitude: 42.3601, longitude: -71.0589 };
    expect(haversineMiles(a, b)).toBe(haversineMiles(b, a));
  });
});

describe('formatDistanceMiles', () => {
  it('formats whole numbers', () => {
    expect(formatDistanceMiles(10)).toBe('10 mi');
  });

  it('rounds to one decimal', () => {
    expect(formatDistanceMiles(12.34)).toBe('12.3 mi');
    expect(formatDistanceMiles(12.36)).toBe('12.4 mi');
  });

  it('returns "< 0.1 mi" for very small distances', () => {
    expect(formatDistanceMiles(0.05)).toBe('< 0.1 mi');
    expect(formatDistanceMiles(0)).toBe('< 0.1 mi');
  });

  it('returns null for null or undefined', () => {
    expect(formatDistanceMiles(null)).toBeNull();
    expect(formatDistanceMiles(undefined)).toBeNull();
  });

  it('returns null for negative or NaN', () => {
    expect(formatDistanceMiles(-1)).toBeNull();
    expect(formatDistanceMiles(NaN)).toBeNull();
  });
});
