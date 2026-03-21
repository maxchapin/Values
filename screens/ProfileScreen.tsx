import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import { theme } from '../theme';

/**
 * Profile Screen - Same card design as Discover.
 * Top bar: Edit, Profile title, Settings. Card shows profile as in Discover (no in-card Edit).
 */
export const ProfileScreen: React.FC = () => {
  const { currentUser } = useUserStore();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { handlePress: handleTitlePress, isDebugMode } = useDebugAccess();

  useEffect(() => {
    trackScreenView('Profile');
  }, []);

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
    <ScreenContainer contentPadding={false} headerBackgroundColor={theme.colors.headerBackground}>
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

        {/* Card area: same padding as Discover so card looks identical */}
        <View style={styles.cardArea}>
          <ProfileCard
            user={currentUser}
            showEditButton={false}
            onValuesPress={handleValuesPress}
            scrollViewProps={{
              contentContainerStyle: {
                paddingTop: theme.spacing.md,
                paddingBottom: theme.spacing['2xl'],
              },
            }}
          />
        </View>
      </View>
    </ScreenContainer>
  );
};

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
});
