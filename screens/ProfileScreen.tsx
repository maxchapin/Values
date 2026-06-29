import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../store/userStore';
import {
  navigateToValuesEditorFromProfile,
  type NavigateToValuesEditorNav,
} from '../navigation/navigateToValuesEditor';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { ProfileCard } from '../components/ProfileCard';
import { useDebugAccess } from '../hooks/useDebugAccess';
import { trackScreenView } from '../services/analytics';
import { formatRelativeTime, formatDuration } from '../utils/formatRelativeTime';
import { deleteCheckin, type UserCheckinRecord } from '../services/supabaseCheckin';
import { theme } from '../theme';

const CHECKIN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function getCheckinStatus(r: UserCheckinRecord): { label: string; tone: 'pending' | 'visible' | 'expired' } {
  const now = Date.now();
  const visibleAfter = new Date(r.visibleAfter).getTime();
  const expiresAt = new Date(r.scannedAt).getTime() + CHECKIN_WINDOW_MS;
  if (now < visibleAfter) return { label: `Visible in ${formatDuration(visibleAfter - now)}`, tone: 'pending' };
  if (now < expiresAt) return { label: '👁 Visible to others', tone: 'visible' };
  return { label: 'No longer shown', tone: 'expired' };
}

/**
 * Profile Screen - Same card design as Discover.
 * Top bar: Edit, Profile title, Settings. Card shows profile as in Discover (no in-card Edit).
 */
export const ProfileScreen: React.FC = () => {
  const { currentUser } = useUserStore();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { handlePress: handleTitlePress, isDebugMode } = useDebugAccess();
  const [activeTab, setActiveTab] = useState<'profile' | 'places'>('profile');
  const [checkinHistory, setCheckinHistory] = useState<UserCheckinRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    trackScreenView('Profile');
  }, []);

  useEffect(() => {
    if (activeTab !== 'places' || !currentUser?.id || checkinHistory.length > 0) return;
    setHistoryLoading(true);
    import('../services/supabaseCheckin')
      .then(({ getUserCheckinHistory }) => getUserCheckinHistory(currentUser.id))
      .then(setCheckinHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [activeTab, currentUser?.id]);

  useEffect(() => {
    if (isDebugMode && navigation) {
      (navigation as any).navigate('Debug');
    }
  }, [isDebugMode, navigation]);

  if (!currentUser) {
    return (
      <EmptyState
        icon="👤"
        title="No Profile"
        message="Please complete your profile setup to view your profile."
      />
    );
  }

  const handleEdit = (): void => {
    (navigation as any).navigate('EditProfile');
  };

  const handleSettings = (): void => {
    (navigation as any).navigate('Settings');
  };

  const handleValuesPress = (): void => {
    navigateToValuesEditorFromProfile(navigation as NavigateToValuesEditorNav, currentUser);
  };

  return (
    <ScreenContainer
      contentPadding={false}
      headerBackgroundColor={theme.colors.headerBackground}
      safeAreaEdges={[]}
    >
      <View style={styles.container}>
        {/* Top bar: Edit, Profile title, Settings */}
        <View
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + theme.spacing.sm,
              backgroundColor: theme.colors.headerBackground,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleEdit}
            style={styles.topBarButton}
            activeOpacity={0.7}
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
          >
            <Text style={styles.topBarButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTitlePress}
            style={styles.topBarButton}
            activeOpacity={0.7}
            accessibilityLabel="Profile"
            accessibilityRole="button"
          >
            <Text style={styles.headerTitle}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSettings}
            style={styles.topBarButton}
            activeOpacity={0.7}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tab selector */}
        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
            onPress={() => setActiveTab('profile')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'profile' }}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
              Profile
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'places' && styles.tabActive]}
            onPress={() => setActiveTab('places')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'places' }}
          >
            <Text style={[styles.tabText, activeTab === 'places' && styles.tabTextActive]}>
              Places
            </Text>
          </Pressable>
        </View>

        {/* Tab content */}
        {activeTab === 'profile' && (
          <View style={styles.cardArea}>
            <ProfileCard
              user={currentUser}
              showEditButton={false}
              isOwnProfile
              onValuesPress={handleValuesPress}
              scrollViewProps={{
                contentContainerStyle: {
                  paddingTop: theme.spacing.md,
                  paddingBottom: theme.spacing['2xl'],
                },
              }}
            />
          </View>
        )}

        {activeTab === 'places' && (
          <View style={styles.placesArea}>
            {historyLoading ? (
              <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
            ) : checkinHistory.length === 0 ? (
              <EmptyState
                icon="📍"
                title="No check-ins yet"
                message="Scan a QR code at a venue to start building your places history."
                actionLabel="Scan QR Code"
                onAction={() => (navigation as any).navigate('QRScanner')}
              />
            ) : (
              <PlacesHistoryView
                records={checkinHistory}
                onScanPress={() => (navigation as any).navigate('QRScanner')}
                onRemove={(checkinId) =>
                  setCheckinHistory((prev) => prev.filter((r) => r.checkinId !== checkinId))
                }
              />
            )}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
};

// ---------------------------------------------------------------------------
// Places history grouped by category
// ---------------------------------------------------------------------------
function PlacesHistoryView({
  records,
  onRemove,
}: {
  records: UserCheckinRecord[];
  onScanPress: () => void;
  onRemove: (checkinId: string) => void;
}) {
  const grouped = records.reduce<Map<string, UserCheckinRecord[]>>((acc, r) => {
    const key = r.category ?? 'other';
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(r);
    return acc;
  }, new Map());

  const handleRemove = (r: UserCheckinRecord): void => {
    Alert.alert(
      'Remove this place?',
      `This removes your check-in at ${r.venueName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCheckin(r.checkinId);
              onRemove(r.checkinId);
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Failed to remove check-in';
              Alert.alert('Could not remove', message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      contentContainerStyle={placesStyles.list}
      showsVerticalScrollIndicator={false}
    >
      {Array.from(grouped.entries()).map(([category, items]) => (
        <View key={category} style={placesStyles.group}>
          <Text style={placesStyles.categoryHeader}>
            {category.replace(/_/g, ' ').toUpperCase()}
          </Text>
          {items.map((r) => (
            <View key={r.checkinId} style={placesStyles.row}>
              <View style={placesStyles.rowLeft}>
                <Text style={placesStyles.venueName} numberOfLines={1}>
                  {r.venueName}
                </Text>
                <Text style={placesStyles.venueDate}>
                  {formatRelativeTime(r.scannedAt)}
                </Text>
              </View>
              <View style={placesStyles.rowRight}>
                <Text
                  style={[
                    placesStyles.visibilityLabel,
                    getCheckinStatus(r).tone === 'visible' && placesStyles.visibilityLabelVisible,
                  ]}
                >
                  {getCheckinStatus(r).label}
                </Text>
                <Pressable
                  onPress={() => handleRemove(r)}
                  hitSlop={8}
                  accessibilityLabel={`Remove check-in at ${r.venueName}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.textTertiary} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const placesStyles = StyleSheet.create({
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
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexShrink: 0,
  },
  venueName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
  },
  venueDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  visibilityLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    flexShrink: 0,
  },
  visibilityLabelVisible: {
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.headerBorder,
    minHeight: 44,
  },
  topBarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 44,
  },
  topBarButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.headerTint,
  },
  cardArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 0,
    backgroundColor: theme.colors.background,
  },
  placesArea: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.colors.background,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.textInverse,
  },
});
