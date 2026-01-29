import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useUserStore } from '../store/userStore';
import { DiscoverProfileCard } from '../components/DiscoverProfileCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { trackScreenView } from '../services/analytics';
import { theme } from '../theme';
import { RootStackParamList } from '../navigation/types';

type ProfilePreviewScreenProps = NativeStackScreenProps<RootStackParamList, 'ProfilePreview'>;

/**
 * Profile Preview Screen
 * Shows the user's profile exactly as it appears to others in Discover/Matches
 * Uses the same card layout and styling for visual consistency
 */
export const ProfilePreviewScreen: React.FC<ProfilePreviewScreenProps> = ({ navigation }) => {
  const { currentUser } = useUserStore();
  const cardScrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    trackScreenView('ProfilePreview');
  }, []);

  if (!currentUser) {
    return (
      <EmptyState
        icon="👤"
        title="No Profile"
        message="Please complete your profile setup to view your profile preview."
      />
    );
  }

  // Create a sanitized user object that only includes public fields
  // This ensures we don't accidentally display private data (email, internal IDs, etc.)
  const publicUser = {
    ...currentUser,
    // Explicitly exclude private fields by only including what we need
    // The card component will only render: photos, name, age, locationLabel, hometown, prompts, valuesProfile
  };

  return (
    <ScreenContainer contentPadding={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Preview</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Card Area */}
        <View style={styles.cardArea}>
          <DiscoverProfileCard
            ref={cardScrollRef}
            candidate={publicUser}
            mode="self"
            scrollViewProps={{
              contentContainerStyle: { paddingBottom: theme.spacing['2xl'] },
            }}
          />
        </View>

        {/* Footer hint */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is how your profile appears to others in Discover and Matches
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.base,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
  },
  backButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 60, // Match back button width for centering
  },
  cardArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.base,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.base,
    backgroundColor: theme.colors.background,
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
});
