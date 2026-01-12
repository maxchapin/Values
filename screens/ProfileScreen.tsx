import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '../store/userStore';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { useDebugAccess } from '../hooks/useDebugAccess';
import { trackScreenView } from '../services/analytics';
import { ScreenContainer } from '../components/ScreenContainer';
import { theme } from '../theme';

/**
 * Profile Screen - Placeholder
 * TODO: Implement full profile view and editing
 */
export const ProfileScreen: React.FC = () => {
  const { currentUser, logout } = useUserStore();
  const navigation = useNavigation();
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

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.7}>
          <Text style={styles.title}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{currentUser.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Age</Text>
        <Text style={styles.value}>{currentUser.age}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{currentUser.location}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Bio</Text>
        <Text style={styles.value}>{currentUser.bio}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Selected Values</Text>
        <Text style={styles.value}>{currentUser.selectedValues.length} values selected</Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Logout"
          onPress={logout}
          style={{ backgroundColor: theme.colors.error }}
        />
      </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing['4xl'],
  },
  header: {
    marginBottom: theme.spacing['2xl'],
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  section: {
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  footer: {
    marginTop: theme.spacing['2xl'],
    paddingTop: theme.spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
