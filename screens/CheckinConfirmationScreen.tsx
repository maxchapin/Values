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

export const CheckinConfirmationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CheckinConfirmationRouteProp>();
  const insets = useSafeAreaInsets();
  const { qrToken } = route.params;

  if (__DEV__) {
    console.log('[CheckinConfirmation] Received qrToken:', qrToken);
    console.log('[CheckinConfirmation] Token length:', qrToken?.length);
    console.log('[CheckinConfirmation] Looks like URL?', qrToken?.startsWith('http'));
  }

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecordCheckinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckin = async () => {
    if (__DEV__) {
      console.log('[CheckinConfirmation] Submitting check-in with token:', qrToken);
    }
    setLoading(true);
    setError(null);
    try {
      const res = await recordCheckin({ qrToken, visibilityMode: 'private' });
      if (__DEV__) console.log('[CheckinConfirmation] Check-in result:', JSON.stringify(res));
      setResult(res);
    } catch (e) {
      if (__DEV__) console.log('[CheckinConfirmation] Check-in error:', e);
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

            <Text style={styles.successMessage}>
              {"You'll be able to see others who checked in here, and they'll be able to see you, within 24 hours."}
            </Text>

            {result.gpsMismatch ? (
              <View style={styles.flagBanner}>
                <Text style={styles.flagText}>
                  ⚠️ You appear to be far from this venue
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={[styles.primaryButton, styles.doneButton]} onPress={handleDone}>
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

        {/* DEV: token debug banner */}
        {__DEV__ && (
          <View style={styles.debugBanner}>
            <Text style={styles.debugLabel}>DEV — qrToken</Text>
            <Text style={styles.debugValue} selectable>{qrToken}</Text>
          </View>
        )}

        {/* Pre-submit state */}
        {!result && !error && (
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleCheckin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textInverse} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Check In</Text>
            )}
          </TouchableOpacity>
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
    color: theme.colors.textInverse,
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
  doneButton: {
    alignSelf: 'stretch',
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

  // Dev debug banner
  debugBanner: {
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    padding: 10,
    marginBottom: 4,
  },
  debugLabel: {
    color: '#7fdbff',
    fontSize: 10,
    fontWeight: '700' as const,
    marginBottom: 4,
    letterSpacing: 1,
  },
  debugValue: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
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
