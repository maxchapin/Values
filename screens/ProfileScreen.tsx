import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '../store/userStore';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { ProfilePhotoCarousel } from '../components/ProfilePhotoCarousel';
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
    <ScreenContainer scrollable>
      <ProfilePhotoCarousel
        photos={Array.isArray(currentUser.photos) ? currentUser.photos : []}
        name={currentUser.name}
        height={360}
        style={styles.mainPhoto}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.7}>
          <Text style={styles.title}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>First Name</Text>
        <Text style={styles.value}>{currentUser.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Age</Text>
        <Text style={styles.value}>{currentUser.age}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{currentUser.locationLabel ?? 'Not set'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Where are you from?</Text>
        <Text style={styles.value}>{currentUser.hometown || '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Interested In</Text>
        <Text style={styles.value}>
          {currentUser.interestedIn === 'men'
            ? 'Men'
            : currentUser.interestedIn === 'women'
              ? 'Women'
              : currentUser.interestedIn === 'everyone'
                ? 'Everyone'
                : '—'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Bio</Text>
        <Text style={styles.value}>{currentUser.bio}</Text>
      </View>

      {currentUser.prompts && Array.isArray(currentUser.prompts) && currentUser.prompts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Prompts</Text>
          {currentUser.prompts.slice(0, 3).map((p) => (
            <View key={p.id} style={styles.promptItem}>
              <Text style={styles.promptQuestion}>{p.question}</Text>
              <Text style={styles.promptAnswer}>{p.answer}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Selected Values</Text>
        <Text style={styles.value}>{currentUser.selectedValues.length} values selected</Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Logout"
          onPress={async () => {
            await logout();
            // Navigation will automatically update based on isAuthenticated state
          }}
          style={{ backgroundColor: theme.colors.error }}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  mainPhoto: {
    marginBottom: theme.spacing.lg,
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
  promptItem: {
    marginTop: theme.spacing.base,
  },
  promptQuestion: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  promptAnswer: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
});
