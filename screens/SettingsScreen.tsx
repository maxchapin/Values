import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useUserStore } from '../store/userStore';
import { ScreenContainer } from '../components/ScreenContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { trackScreenView } from '../services/analytics';
import { theme } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { UserSettings } from '../types/user';

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

/**
 * Settings Screen
 * Account settings, notification preferences, and help/support
 */
export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { currentUser, updateSettings, deleteAccount, logout } = useUserStore();
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [notifications, setNotifications] = useState({
    newMatch: true,
    newMessage: true,
    newLikesYou: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    trackScreenView('Settings');
  }, []);

  // Initialize settings from user profile
  useEffect(() => {
    if (currentUser?.settings) {
      setIsProfileVisible(currentUser.settings.isProfileVisible);
      setNotifications(currentUser.settings.notifications);
    }
  }, [currentUser]);

  const handleProfileVisibilityToggle = async (value: boolean): Promise<void> => {
    setIsProfileVisible(value);
    setIsSaving(true);
    try {
      await updateSettings({ isProfileVisible: value });
    } catch (error) {
      // Revert on error
      setIsProfileVisible(!value);
      Alert.alert('Error', 'Failed to update profile visibility');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationToggle = async (key: keyof UserSettings['notifications'], value: boolean): Promise<void> => {
    const updatedNotifications = { ...notifications, [key]: value };
    setNotifications(updatedNotifications);
    setIsSaving(true);
    try {
      await updateSettings({ notifications: updatedNotifications });
    } catch (error) {
      // Revert on error
      setNotifications({ ...notifications, [key]: !value });
      Alert.alert('Error', `Failed to update ${key} notification preference`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubscriptionManagement = (): void => {
    Alert.alert('Subscriptions', 'Subscription management coming soon!', [{ text: 'OK' }]);
  };

  const handleHelp = (): void => {
    Alert.alert(
      'Help & Support',
      'For help and support, please contact us at support@valuesdatingapp.com',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = (): void => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete your account and all data. Are you absolutely sure?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      // Navigation will automatically update based on isAuthenticated state
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
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
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings & Help</Text>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        {/* Show Profile Toggle */}
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

        {/* Email Display */}
        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Email</Text>
            <Text style={styles.settingValue}>{currentUser.email}</Text>
          </View>
        </View>

        {/* Subscription Management */}
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

        {/* Delete Account */}
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

      {/* Logout Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.settingRow, styles.logoutRow]}
          onPress={async () => {
            await logout();
            // Navigation will automatically update based on isAuthenticated state
          }}
          activeOpacity={0.7}
        >
          <View style={styles.settingContent}>
            <Text style={[styles.settingLabel, styles.logoutText]}>Logout</Text>
            <Text style={[styles.settingDescription, styles.logoutText]}>
              Sign out of your account
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        {/* New Match */}
        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>New Match</Text>
            <Text style={styles.settingDescription}>
              Get notified when someone likes you back
            </Text>
          </View>
          <Switch
            value={notifications.newMatch}
            onValueChange={(value) => handleNotificationToggle('newMatch', value)}
            disabled={isSaving}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.background}
          />
        </View>

        {/* New Message */}
        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>New Message</Text>
            <Text style={styles.settingDescription}>
              Get notified when you receive a new message
            </Text>
          </View>
          <Switch
            value={notifications.newMessage}
            onValueChange={(value) => handleNotificationToggle('newMessage', value)}
            disabled={isSaving}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.background}
          />
        </View>

        {/* New Likes You */}
        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>New "Likes You"</Text>
            <Text style={styles.settingDescription}>
              Get notified when someone likes your profile
            </Text>
          </View>
          <Switch
            value={notifications.newLikesYou}
            onValueChange={(value) => handleNotificationToggle('newLikesYou', value)}
            disabled={isSaving}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.background}
          />
        </View>
      </View>

      {/* Help & Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help & Support</Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={handleHelp}
          activeOpacity={0.7}
        >
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Help / FAQ</Text>
            <Text style={styles.settingDescription}>Get help and answers to common questions</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Settings are saved automatically
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
    fontWeight: theme.typography.fontWeight.light,
  },
  footer: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
