import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { theme } from '../theme';
import { searchPlaces, reverseGeocode, type GeocodeResult } from '../services/geocoding';

/** Default map center when no saved location (Cambridge, MA) */
const DEFAULT_REGION: Region = {
  latitude: 42.3601,
  longitude: -71.0589,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPickerProps {
  /** Current or initial coordinates. If null, map uses default center and no pin. */
  coordinates: LocationCoordinates | null;
  /** Current or initial human-readable label from reverse geocoding. */
  locationLabel: string | null;
  /** Called when the user sets/moves the pin or selects a search result. */
  onChange: (coordinates: LocationCoordinates, locationLabel: string | null) => void;
  /** Optional validation error message. */
  error?: string | null;
  /** Map height. Default 240. */
  mapHeight?: number;
  /** Placeholder for search input. */
  searchPlaceholder?: string;
}

const SEARCH_DEBOUNCE_MS = 400;

export const LocationPicker: React.FC<LocationPickerProps> = ({
  coordinates,
  locationLabel,
  onChange,
  error = null,
  mapHeight = 240,
  searchPlaceholder = 'Search for a city or address...',
}) => {
  const mapRef = useRef<MapView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const region: Region = coordinates
    ? {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : DEFAULT_REGION;

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchPlaces(q);
      setSuggestions(results);
      if (results.length === 0) setSearchError('No results found');
      else setSearchError(null);
    } catch {
      setSuggestions([]);
      setSearchError('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      fetchSuggestions(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, fetchSuggestions]);

  const handleSelectSuggestion = useCallback(
    async (item: GeocodeResult) => {
      Keyboard.dismiss();
      setSearchQuery('');
      setSuggestions([]);
      setSearchError(null);

      const coords: LocationCoordinates = { latitude: item.lat, longitude: item.lon };
      mapRef.current?.animateToRegion({
        latitude: item.lat,
        longitude: item.lon,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      const label = await reverseGeocode(item.lat, item.lon);
      onChange(coords, label);
    },
    [onChange]
  );

  const handleMapPress = useCallback(
    async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      const coords: LocationCoordinates = { latitude, longitude };
      const label = await reverseGeocode(latitude, longitude);
      onChange(coords, label);
    },
    [onChange]
  );

  const handleMarkerDragEnd = useCallback(
    async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      const coords: LocationCoordinates = { latitude, longitude };
      const label = await reverseGeocode(latitude, longitude);
      onChange(coords, label);
    },
    [onChange]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Location *</Text>
      <Text style={styles.hint}>Tap the map or drag the pin to set your location. You can also search below.</Text>

      <View style={[styles.searchWrap]}>
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
        />
        {isSearching && (
          <View style={styles.searchSpinner}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}
      </View>

      {searchError && <Text style={styles.searchError}>{searchError}</Text>}

      {suggestions.length > 0 && (
        <ScrollView
          style={styles.suggestions}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.placeId}
              style={styles.suggestionRow}
              onPress={() => handleSelectSuggestion(item)}
              activeOpacity={0.7}
              accessibilityLabel={`Select ${item.displayName}`}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>
                {item.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={[styles.mapWrap, { height: mapHeight }]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onPress={handleMapPress}
          showsUserLocation={false}
        >
          {coordinates && (
            <Marker
              coordinate={{ latitude: coordinates.latitude, longitude: coordinates.longitude }}
              draggable
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </MapView>
      </View>

      {locationLabel && (
        <Text style={styles.selectedLabel}>Selected: {locationLabel}</Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.backgroundTertiary,
  },
  searchInput: {
    flex: 1,
    padding: theme.spacing.base,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
  },
  searchSpinner: {
    paddingRight: theme.spacing.base,
  },
  searchError: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  suggestions: {
    maxHeight: 160,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  suggestionRow: {
    padding: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  suggestionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
  },
  mapWrap: {
    width: '100%',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  selectedLabel: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  error: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
  },
});
