/**
 * ValuesOnboardingScreen
 * Two-step flow: select 3–10 values → summary → confirm.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useValuesOnboardingStore, buildValuesProfileFromIds, MIN_SELECTION, MAX_SELECTION } from '../../store/valuesOnboardingStore';
import { useUserStore } from '../../store/userStore';
import { ValuesCloud } from '../../components/ValuesCloud';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { theme } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { upsertSupabaseProfile } from '../../services/supabaseProfile';
import { INITIAL_VALUES } from '../../data/valuesConstants';

type ValuesOnboardingScreenProps = NativeStackScreenProps<RootStackParamList, 'ValuesOnboarding'>;

export const ValuesOnboardingScreen: React.FC<ValuesOnboardingScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    selectedValueIds,
    currentStep,
    canProceed,
    isAtCap,
    toggleValue,
    proceedToNextStep,
    goToPreviousStep,
    resetValues,
    initializeFromProfile,
    getStepInfo,
  } = useValuesOnboardingStore();

  const [saving, setSaving] = React.useState(false);
  const { user: authUser, refreshProfile } = useAuth();
  const stepInfo = getStepInfo();

  const fromEditProfile = route.params?.fromEditProfile;
  const fromProfileCard = route.params?.fromProfileCard;
  const isEditMode = !!(fromEditProfile || fromProfileCard);

  const discardAndClose = useCallback((): void => {
    const savedProfile = useUserStore.getState().currentUser?.valuesProfile;
    if (isEditMode && savedProfile) {
      initializeFromProfile(savedProfile);
    } else {
      resetValues();
    }
    navigation.goBack();
  }, [navigation, isEditMode, initializeFromProfile, resetValues]);

  const handleComplete = async (): Promise<void> => {
    setSaving(true);
    try {
      const valuesProfile = buildValuesProfileFromIds(selectedValueIds);

      if (__DEV__) {
        console.log('[ValuesOnboarding] Saving values:', valuesProfile.selectedValueIds);
      }

      const { updateValuesProfile } = useUserStore.getState();
      await updateValuesProfile(valuesProfile);

      if (authUser) {
        const { currentUser } = useUserStore.getState();
        if (currentUser) {
          await upsertSupabaseProfile(authUser, currentUser);
          await refreshProfile();
        }
      } else {
        Alert.alert('Not signed in', 'Values saved on device only. Sign in again to sync.');
      }

      if (isEditMode) {
        navigation.goBack();
      }
      // Otherwise AppNavigator routes to main app once is_onboarding_complete is set
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save values';
      if (__DEV__) console.error('[ValuesOnboarding] Save failed:', error);
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  };

  // ── Summary step ─────────────────────────────────────────────────────────────
  if (currentStep === 'summary') {
    const selectedLabels = selectedValueIds
      .map((id) => INITIAL_VALUES.find((v) => v.id === id)?.label ?? id)
      .sort();

    return (
      <ScreenContainer contentPadding={false}>
        <View style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}>
          <TouchableOpacity
            onPress={discardAndClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close without saving"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{stepInfo.title}</Text>
          <Text style={styles.subtitle}>{stepInfo.subtitle}</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.summaryContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedLabels.map((label) => (
            <View key={label} style={styles.summaryRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.base }]}>
          <SecondaryButton
            title="Back"
            onPress={goToPreviousStep}
            style={styles.footerSecondary}
          />
          <PrimaryButton
            title={saving ? '' : isEditMode ? 'Save' : 'Confirm'}
            onPress={handleComplete}
            disabled={saving}
            style={styles.footerPrimary}
          >
            {saving ? <ActivityIndicator color={theme.colors.textInverse} size="small" /> : null}
          </PrimaryButton>
        </View>
      </ScreenContainer>
    );
  }

  // ── Select step (default) ─────────────────────────────────────────────────────
  const count = selectedValueIds.length;
  const counterColor = count >= MIN_SELECTION ? theme.colors.success : theme.colors.textSecondary;

  return (
    <ScreenContainer contentPadding={false}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}>
        <TouchableOpacity
          onPress={discardAndClose}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close without saving"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{stepInfo.title}</Text>
        <Text style={[styles.counter, { color: counterColor }]}>
          {count} / {MAX_SELECTION} selected
        </Text>
      </View>

      <ValuesCloud
        values={INITIAL_VALUES}
        selectedValueIds={selectedValueIds}
        onToggle={toggleValue}
        maxReached={isAtCap()}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.base }]}>
        <PrimaryButton
          title="Continue"
          onPress={proceedToNextStep}
          disabled={!canProceed()}
          style={styles.footerFull}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  counter: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  footerFull: {
    flex: 1,
  },
  footerSecondary: {
    flex: 1,
  },
  footerPrimary: {
    flex: 2,
  },
  summaryContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  summaryLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
