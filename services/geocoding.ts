/**
 * Geocoding service using OpenStreetMap Nominatim (free, no API key).
 * Search: place name/address → suggestions with coordinates.
 * Reverse: coordinates → human-readable address label.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'ValuesDatingApp/1.0 (React Native; dating app location picker)';

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
  placeId: number;
}

export interface ReverseGeocodeResult {
  displayName: string;
  lat: string;
  lon: string;
}

function buildHeaders(): HeadersInit {
  return {
    'Accept': 'application/json',
    'Accept-Language': 'en',
    'User-Agent': USER_AGENT,
  };
}

/**
 * Search for places by name/address. Returns up to 5 suggestions.
 */
export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    limit: '5',
    addressdetails: '0',
  });
  const url = `${NOMINATIM_BASE}/search?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: buildHeaders() });
    if (!res.ok) {
      if (__DEV__) console.warn('[Geocoding] searchPlaces non-OK:', res.status);
      return [];
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string; place_id: number }>;
    if (!Array.isArray(data)) return [];
    return data.map((item) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name ?? '',
      placeId: item.place_id,
    }));
  } catch (e) {
    if (__DEV__) console.warn('[Geocoding] searchPlaces error:', e);
    return [];
  }
}

/**
 * Reverse geocode: coordinates → human-readable label (e.g. "Cambridge, MA, USA").
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const detailed = await reverseGeocodeDetailed(lat, lon);
  return detailed?.displayName ?? null;
}

/** Address parts from Nominatim (addressdetails=1). Keys vary by region. */
type NominatimAddress = Record<string, string>;

/** Preferred keys for "neighborhood" display, in order. */
const NEIGHBORHOOD_KEYS = [
  'neighbourhood',
  'suburb',
  'village',
  'city_district',
  'district',
  'borough',
  'subdivision',
  'town',
  'city',
];

/**
 * Reverse geocode with detailed address. Returns display name and a neighborhood-style
 * label (e.g. "Harvard Square", "Central Square") for showing on profile.
 */
export interface ReverseGeocodeDetailedResult {
  displayName: string;
  /** Neighborhood / area name for profile display, or null if not available. */
  neighborhood: string | null;
}

export async function reverseGeocodeDetailed(
  lat: number,
  lon: number
): Promise<ReverseGeocodeDetailedResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'json',
    addressdetails: '1',
  });
  const url = `${NOMINATIM_BASE}/reverse?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: buildHeaders() });
    if (!res.ok) {
      if (__DEV__) console.warn('[Geocoding] reverseGeocodeDetailed non-OK:', res.status);
      return null;
    }
    const data = (await res.json()) as {
      display_name?: string;
      address?: NominatimAddress;
    };
    const displayName = typeof data?.display_name === 'string' ? data.display_name : '';
    const address = data?.address;
    let neighborhood: string | null = null;
    if (address && typeof address === 'object') {
      const addr = address as NominatimAddress;
      for (const key of NEIGHBORHOOD_KEYS) {
        const v = addr[key];
        if (typeof v === 'string' && v.trim()) {
          neighborhood = v.trim();
          break;
        }
      }
    }
    return { displayName, neighborhood };
  } catch (e) {
    if (__DEV__) console.warn('[Geocoding] reverseGeocodeDetailed error:', e);
    return null;
  }
}
