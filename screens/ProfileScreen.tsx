import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../store/userStore';
import { EmptyState } from '../components/EmptyState';
import { ProfilePhotoCarousel } from '../components/ProfilePhotoCarousel';
import { useDebugAccess } from '../hooks/useDebugAccess';
import { trackScreenView } from '../services/analytics';
import { theme } from '../theme';

/**
 * Profile Screen - Redesigned with best practices
 * Features: Top action bar, proper padding, visual hierarchy, card-based sections
 */
export const ProfileScreen: React.FC = () => {
  const { currentUser } = useUserStore();
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

  const handleEdit = (): void => {
    (navigation as any).navigate('EditProfile');
  };

  const handleView = (): void => {
    (navigation as any).navigate('ProfilePreview');
  };

  const handleSettings = (): void => {
    (navigation as any).navigate('Settings');
  };

  // Get top 5 values for display
  const top5Values = currentUser.valuesProfile?.top5Ids
    .map((id) => {
      const value = currentUser.valuesProfile!.allValues.find((v) => v.id === id);
      return value?.label;
    })
    .filter(Boolean) || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleEdit}
          style={styles.topBarButton}
          activeOpacity={0.7}
          accessibilityLabel="Edit Profile"
          accessibilityRole="button"
        >
          <Text style={styles.topBarButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleView}
          style={styles.topBarButton}
          activeOpacity={0.7}
          accessibilityLabel="View as others see you"
          accessibilityRole="button"
        >
          <Text style={styles.topBarButtonText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSettings}
          style={styles.topBarButton}
          activeOpacity={0.7}
          accessibilityLabel="Settings"
          accessibilityRole="button"
        >
          <Text style={styles.topBarIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photos Carousel - Full width minus padding */}
        <View style={styles.photosContainer}>
          <ProfilePhotoCarousel
            photos={Array.isArray(currentUser.photos) ? currentUser.photos : []}
            name={currentUser.name}
            height={400}
          />
        </View>

        {/* Name + Age + Location - Large, Centered */}
        <View style={styles.identitySection}>
          <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.7}>
            <Text style={styles.name}>{currentUser.name}</Text>
          </TouchableOpacity>
          <Text style={styles.ageLocation}>
            {currentUser.age} • {currentUser.locationLabel ?? 'Location not set'}
          </Text>
        </View>

        {/* Values Cloud - Top 5 Prominently Displayed */}
        {top5Values.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Core Values</Text>
            <View style={styles.valuesContainer}>
              {top5Values.map((label, index) => (
                <View key={index} style={styles.valueChip}>
                  <Text style={styles.valueChipText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Prompts Section - Card-like Container */}
        {currentUser.prompts && Array.isArray(currentUser.prompts) && currentUser.prompts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prompts</Text>
            {currentUser.prompts.slice(0, 3).map((p) => (
              <View key={p.id} style={styles.promptItem}>
                <Text style={styles.promptQuestion}>{p.question}</Text>
                <Text style={styles.promptAnswer}>{p.answer}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bio Section */}
        {currentUser.bio && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
            <Text style={styles.bioText}>{currentUser.bio}</Text>
          </View>
        )}

        {/* Other Info Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          
          {currentUser.hometown && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From</Text>
              <Text style={styles.detailValue}>{currentUser.hometown}</Text>
            </View>
          )}

          {currentUser.interestedIn && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Interested In</Text>
              <Text style={styles.detailValue}>
                {currentUser.interestedIn === 'men'
                  ? 'Men'
                  : currentUser.interestedIn === 'women'
                    ? 'Women'
                    : currentUser.interestedIn === 'everyone'
                      ? 'Everyone'
                      : '—'}
              </Text>
            </View>
          )}

          {currentUser.job && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Job</Text>
              <Text style={styles.detailValue}>{currentUser.job}</Text>
            </View>
          )}

          {currentUser.education && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Education</Text>
              <Text style={styles.detailValue}>{currentUser.education}</Text>
            </View>
          )}
        </View>

        {/* Bottom spacing for scroll */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // 16px edge padding
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 44, // Thumb-friendly touch target
  },
  topBarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44, // Thumb-friendly touch target
  },
  topBarButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  topBarIcon: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16, // 16px horizontal padding for all content
  },
  photosContainer: {
    marginTop: 0,
    marginBottom: 24, // 24px section spacing
    marginHorizontal: -16, // Negative margin to extend photos to edges
  },
  identitySection: {
    alignItems: 'center',
    marginBottom: 32, // 32px spacing for major sections
  },
  name: {
    fontSize: theme.typography.fontSize['4xl'], // H1 typography
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: 8, // 12px element spacing (8px + 4px line height)
    textAlign: 'center',
  },
  ageLocation: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: 20, // Generous padding inside cards
    marginBottom: 24, // 24px section spacing
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2, // Android shadow
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: 16, // 16px spacing within cards
  },
  valuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4, // 12px element spacing (4px + 8px margin)
  },
  valueChip: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8, // 12px element spacing (8px + 4px)
    marginBottom: 8,
    minHeight: 32, // Touch-friendly
  },
  valueChipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textInverse,
    fontWeight: theme.typography.fontWeight.medium,
  },
  promptItem: {
    marginBottom: 16, // 16px spacing between prompts
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  promptQuestion: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 8, // 12px element spacing (8px + 4px)
  },
  promptAnswer: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  bioText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12, // 12px element spacing
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    flex: 2,
    textAlign: 'right',
  },
  bottomSpacer: {
    height: 32, // Bottom spacing for scroll
  },
});
