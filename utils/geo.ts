/**
 * Geographic distance utilities.
 * Used for distance filtering (backend) and distance display on Discover cards.
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_MILES = 3959;

/**
 * Haversine distance in miles between two points.
 * Returns null if either point is missing or has invalid coordinates.
 */
export function haversineMiles(
  a: LocationCoordinates | null | undefined,
  b: LocationCoordinates | null | undefined
): number | null {
  if (!a || !b) return null;
  const latA = Number(a.latitude);
  const lonA = Number(a.longitude);
  const latB = Number(b.latitude);
  const lonB = Number(b.longitude);
  if (
    !Number.isFinite(latA) ||
    !Number.isFinite(lonA) ||
    !Number.isFinite(latB) ||
    !Number.isFinite(lonB)
  ) {
    return null;
  }
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLon = ((lonB - lonA) * Math.PI) / 180;
  const radLatA = (latA * Math.PI) / 180;
  const radLatB = (latB * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLatA) * Math.cos(radLatB) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Format distance in miles for UI (e.g. "12.3 mi" or "0.5 mi").
 * Returns null if miles is null, undefined, or negative.
 */
export function formatDistanceMiles(miles: number | null | undefined): string | null {
  if (miles == null || miles < 0 || !Number.isFinite(miles)) return null;
  if (miles < 0.1) return '< 0.1 mi';
  const value = Math.round(miles * 10) / 10;
  return `${value} mi`;
}
