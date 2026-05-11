import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { recordCheckin, type RecordCheckinResult } from '../services/supabaseCheckin';
import { theme } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type CheckinConfirmationRouteProp = RouteProp<RootStackParamList, 'CheckinConfirmation'>;

type VisibilityMode = 'public' | 'matches_only' | 'private';

const VISIBILITY_OPTIONS: { key: VisibilityMode; label: string; caption: string }[] = [
  { key: 'public', label: 'Public', caption: 'Anyone checking in here can see you' },
  { key: 'matches_only', label: 'Matches', caption: 'Only your matches see you here' },
  { key: 'private', label: 'Private', caption: 'Not shown to others' },
];

export const CheckinConfirmationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CheckinConfirmationRouteProp>();
  const insets = useSafeAreaInsets();
  const { qrToken } = route.params;

  const [visibility, setVisibility] = useState<VisibilityMode>('public');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecordCheckinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recordCheckin({ qrToken, visibilityMode: visibility });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    (navigation as any).popToTop();
  };

  const handleTryAgain = () => {
    setError(null);
    setResult(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check In</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Success state */}
        {result && !error && (
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>📍</Text>
            <Text style={styles.venueName}>{result.venueName}</Text>
            {result.category ? (
              <Text style={styles.venueCategory}>{result.category}</Text>
            ) : null}

            <Text style={styles.successMessage}>
              {result.alreadyCheckedIn
                ? "You're already checked in here today"
                : "You're checked in!"}
            </Text>

            {result.gpsMismatch ? (
              <View style={styles.flagBanner}>
                <Text style={styles.flagText}>
                  ⚠️ You appear to be far from this venue
                </Text>
              </View>
            ) : null}

            {result.outsideHours ? (
              <View style={styles.flagBanner}>
                <Text style={styles.flagText}>
                  🕐 This venue may be closed right now
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.primaryButton} onPress={handleDone}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error state */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Check-in failed</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleTryAgain}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pre-submit state */}
        {!result && !error && (
          <>
            <Text style={styles.sectionTitle}>Who can see your check-in?</Text>

            {/* Segmented visibility selector */}
            <View style={styles.segmentRow}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.segment, visibility === opt.key && styles.segmentActive]}
                  onPress={() => setVisibility(opt.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: visibility === opt.key }}
                >
                  <Text
                    style={[styles.segmentText, visibility === opt.key && styles.segmentTextActive]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Caption for selected option */}
            <Text style={styles.visibilityCaption}>
              {VISIBILITY_OPTIONS.find((o) => o.key === visibility)?.caption}
            </Text>

            {/* Check In button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleCheckin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Check In</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default CheckinConfirmationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    padding: theme.spacing.xl,
    gap: theme.spacing.base,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: '#fff',
  },
  visibilityCaption: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    minHeight: 50,
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // Success state
  successCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing['2xl'],
  },
  successEmoji: {
    fontSize: 48,
  },
  venueName: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  venueCategory: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  successMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: theme.spacing.sm,
  },
  flagBanner: {
    backgroundColor: theme.colors.warning + '18',
    borderRadius: theme.borderRadius.base,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning + '40',
    alignSelf: 'stretch',
  },
  flagText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    textAlign: 'center',
  },

  // Error state
  errorCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing['2xl'],
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.error,
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
