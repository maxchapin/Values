import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as MailComposer from 'expo-mail-composer';
import Constants from 'expo-constants';
import { useUserStore } from '../store/userStore';
import { useAuth } from '../contexts/AuthContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { trackScreenView } from '../services/analytics';
import { theme } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { UserSettings } from '../types/user';
import {
  updateSupabasePreferences,
  deleteSupabaseProfile,
  deleteAuthUserViaEdge,
} from '../services/supabaseProfile';

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const NOTIFICATION_LABELS: Record<keyof UserSettings['notifications'], string> = {
  newMatch: 'New Match',
  newMessage: 'New Message',
  checkinOverlap: 'Nearby Check-ins',
};

function supportEmailFromConfig(): string {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const v = extra?.supportEmail;
  return typeof v === 'string' && v.includes('@') ? v : 'contact@thelocaldating.com';
}

function legalUrl(key: 'privacyPolicyUrl' | 'termsOfServiceUrl'): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const v = extra?.[key];
  return typeof v === 'string' && v.startsWith('http') ? v : undefined;
}

const openLegalUrl = async (url: string, label: string): Promise<void> => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Unable to open', `Cannot open ${label} link.`);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Error', `Could not open ${label}.`);
  }
};

/**
 * Settings Screen
 * Account settings, notification preferences (working toggles), help/support, logout, delete account.
 */
export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { currentUser, updateSettings } = useUserStore();
  const { signOut, user: authUser } = useAuth();
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [notifications, setNotifications] = useState<UserSettings['notifications']>({
    newMatch: true,
    newMessage: true,
    checkinOverlap: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    trackScreenView('Settings');
  }, []);

  useEffect(() => {
    if (currentUser?.settings) {
      setIsProfileVisible(currentUser.settings.isProfileVisible);
      setNotifications({
        newMatch: currentUser.settings.notifications.newMatch,
        newMessage: currentUser.settings.notifications.newMessage,
        checkinOverlap: currentUser.settings.notifications.checkinOverlap,
      });
    }
  }, [currentUser]);

  const syncPreferencesToSupabase = async (prefs: {
    is_profile_visible: boolean;
    push_new_match: boolean;
    push_new_message: boolean;
    push_checkin_overlap: boolean;
  }): Promise<void> => {
    if (!authUser) return;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Settings] updateSupabasePreferences...');
    }
    await updateSupabasePreferences(prefs);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Settings] updateSupabasePreferences OK');
    }
  };

  const handleProfileVisibilityToggle = async (value: boolean): Promise<void> => {
    setIsProfileVisible(value);
    setIsSaving(true);
    try {
      await updateSettings({ isProfileVisible: value });
    } catch (error) {
      setIsProfileVisible(!value);
      Alert.alert('Error', 'Failed to update profile visibility');
      setIsSaving(false);
      return;
    }
    try {
      await syncPreferencesToSupabase({
        is_profile_visible: value,
        push_new_match: notifications.newMatch,
        push_new_message: notifications.newMessage,
        push_checkin_overlap: notifications.checkinOverlap,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[Settings] Supabase preferences sync failed:', err);
      }
      Alert.alert('Saved on device', `Could not sync settings to the cloud: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationToggle = async (
    key: keyof UserSettings['notifications'],
    value: boolean
  ): Promise<void> => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    setIsSaving(true);
    try {
      await updateSettings({ notifications: updated });
    } catch (error) {
      setNotifications({ ...notifications, [key]: !value });
      Alert.alert('Error', `Failed to update ${NOTIFICATION_LABELS[key]} notification`);
      setIsSaving(false);
      return;
    }
    try {
      await syncPreferencesToSupabase({
        is_profile_visible: isProfileVisible,
        push_new_match: updated.newMatch,
        push_new_message: updated.newMessage,
        push_checkin_overlap: updated.checkinOverlap,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[Settings] Supabase preferences sync failed:', err);
      }
      Alert.alert('Saved on device', `Could not sync notification preference: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubscriptionManagement = (): void => {
    Alert.alert('Subscriptions', 'Subscription management coming soon.', [{ text: 'OK' }]);
  };

  const handleHelp = async (): Promise<void> => {
    const supportAddr = supportEmailFromConfig();
    const canCompose = await MailComposer.isAvailableAsync();
    if (canCompose) {
      await MailComposer.composeAsync({
        recipients: [supportAddr],
        subject: 'The Local App – Help & Support',
        body: 'Please describe your question or issue:\n\n',
      });
    } else {
      Alert.alert(
        'Help & Support',
        `Email us at ${supportAddr} for help and support.`,
        [{ text: 'OK' }, { text: 'Open Mail', onPress: () => Linking.openURL(`mailto:${supportAddr}`) }]
      );
    }
  };

  const handleLogout = (): void => {
    Alert.alert(
      'Log out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = (): void => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete your account and all data. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteSupabaseProfile();
                    } catch (err) {
                      if (__DEV__) console.warn('[Settings] Supabase profile delete failed:', err);
                    }
                    try {
                      await deleteAuthUserViaEdge();
                    } catch (err) {
                      if (__DEV__) console.warn('[Settings] Auth user delete (edge) failed:', err);
                    }
                    try {
                      await signOut();
                    } catch (error) {
                      Alert.alert('Error', 'Failed to complete account deletion. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (!currentUser) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No user data found</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scrollable
      scrollViewProps={{
        contentContainerStyle: styles.scrollContent,
      }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings & Help</Text>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Show profile</Text>
            <Text style={styles.settingDescription}>
              Make your profile visible to others in Discover
            </Text>
          </View>
          <Switch
            value={isProfileVisible}
            onValueChange={handleProfileVisibilityToggle}
            disabled={isSaving}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.background}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Email</Text>
            <Text style={styles.settingValue}>{currentUser.email}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={handleSubscriptionManagement}
          activeOpacity={0.7}
        >
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Subscription management</Text>
            <Text style={styles.settingDescription}>Manage your subscription</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout – above Delete Account */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.settingRow, styles.logoutRow]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.settingContent}>
            <Text style={[styles.settingLabel, styles.logoutText]}>Logout</Text>
            <Text style={[styles.settingDescription, styles.logoutText]}>
              Sign out of your account
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, styles.destructiveRow]}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <View style={styles.settingContent}>
            <Text style={[styles.settingLabel, styles.destructiveText]}>Delete account</Text>
            <Text style={[styles.settingDescription, styles.destructiveText]}>
              Permanently delete your account and all data
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Match alerts</Text>
            <Text style={styles.settingDescription}>Get notified about new matches</Text>
          </View>
          <Switch
            value={notifications.newMatch}
            onValueChange={(value) => handleNotificationToggle('newMatch', value)}
            disabled={isSaving}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.background}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>New messages</Text>
            <Text style={styles.settingDescription}>Get notified about new messages</Text>
          </View>
          <Switch
            value={notifications.newMessage}
            onValueChange={(value) => handleNotificationToggle('newMessage', value)}
            disabled={isSaving}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.background}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Nearby check-ins</Text>
            <Text style={styles.settingDescription}>
              Get notified when someone new checks in nearby
            </Text>
          </View>
          <Switch
            value={notifications.checkinOverlap}
            onValueChange={(value) => handleNotificationToggle('checkinOverlap', value)}
            disabled={isSaving}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.background}
          />
        </View>
      </View>

      {/* Legal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <Text style={styles.sectionHint}>
          Values is for adults 18+. Set live policy URLs via EXPO_PUBLIC_PRIVACY_POLICY_URL and EXPO_PUBLIC_TERMS_OF_SERVICE_URL
          (EAS secrets) or app.json extras.
        </Text>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => {
            const url = legalUrl('privacyPolicyUrl');
            if (url) void openLegalUrl(url, 'Privacy Policy');
            else Alert.alert('Privacy Policy', 'Set extra.privacyPolicyUrl in app.json to your published policy.');
          }}
          activeOpacity={0.7}
        >
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => {
            const url = legalUrl('termsOfServiceUrl');
            if (url) void openLegalUrl(url, 'Terms of Service');
            else Alert.alert('Terms of Service', 'Set extra.termsOfServiceUrl in app.json to your published terms.');
          }}
          activeOpacity={0.7}
        >
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Terms of Service</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Help & Support – mail composer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help & Support</Text>

        <TouchableOpacity style={styles.settingRow} onPress={handleHelp} activeOpacity={0.7}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Help / FAQ</Text>
            <Text style={styles.settingDescription}>Email us for help and answers</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Settings are saved automatically</Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: theme.spacing['2xl'],
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  header: {
    marginBottom: theme.spacing['2xl'],
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  section: {
    marginBottom: theme.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.base,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  destructiveRow: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  settingContent: {
    flex: 1,
    marginRight: theme.spacing.base,
  },
  settingLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
  settingValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  destructiveText: {
    color: theme.colors.error,
  },
  logoutRow: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  logoutText: {
    color: theme.colors.text,
  },
  chevron: {
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.normal,
  },
  footer: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sectionHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  footerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
});
