import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { useUserStore } from '../store/userStore';
import { getNearbyVenues, type NearbyVenueRow } from '../services/supabaseCheckin';
import { ROUTES } from '../navigation/types';
import { theme } from '../theme';

export const NearbyVenuesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser } = useUserStore();
  const [venues, setVenues] = useState<NearbyVenueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const coords = currentUser?.locationCoordinates ?? null;

  useEffect(() => {
    if (!coords) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getNearbyVenues(coords.latitude, coords.longitude)
      .then(setVenues)
      .finally(() => setLoading(false));
  }, [coords?.latitude, coords?.longitude]);

  if (!coords) {
    return (
      <EmptyState
        icon="📍"
        title="Set your location"
        message="Add your location to your profile to find venue partners nearby."
        actionLabel="Edit Profile"
        onAction={() => (navigation as any).navigate(ROUTES.EDIT_PROFILE)}
      />
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (venues.length === 0) {
    return (
      <EmptyState
        icon="🗺️"
        title="No venues nearby yet"
        message="We don't have any partner venues near you yet — check back soon."
      />
    );
  }

  const grouped = venues.reduce<Map<string, NearbyVenueRow[]>>((acc, v) => {
    const key = v.category ?? 'other';
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(v);
    return acc;
  }, new Map());

  return (
    <ScreenContainer contentPadding={false}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {Array.from(grouped.entries()).map(([category, items]) => (
          <View key={category} style={styles.group}>
            <Text style={styles.categoryHeader}>{category.replace(/_/g, ' ').toUpperCase()}</Text>
            {items.map((v) => (
              <View key={v.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.venueName} numberOfLines={1}>{v.name}</Text>
                  {v.address ? (
                    <Text style={styles.venueAddress} numberOfLines={1}>{v.address}</Text>
                  ) : null}
                </View>
                <Text style={styles.distance}>{v.distanceMiles.toFixed(1)} mi</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
};

export default NearbyVenuesScreen;

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
  },
  group: {
    marginBottom: theme.spacing.lg,
  },
  categoryHeader: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
  },
  venueName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
  },
  venueAddress: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  distance: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    flexShrink: 0,
  },
});
