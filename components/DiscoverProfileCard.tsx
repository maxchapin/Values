import React from 'react';
import { View, Text, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { Card } from './Card';
import { TagPill } from './TagPill';
import { ProfilePhotoCarousel } from './ProfilePhotoCarousel';
import { theme } from '../theme';
import { User } from '../types/user';
import { Value } from '../types/value';

interface DiscoverProfileCardProps {
  candidate: User;
  currentUserTopValues: Value[];
  candidateTopValues: Value[];
  sharedValueIds: Set<string>;
  scrollViewProps?: Omit<ScrollViewProps, 'ref'>;
}

export const DiscoverProfileCard = React.forwardRef<ScrollView, DiscoverProfileCardProps>(
  ({ candidate, currentUserTopValues, candidateTopValues, sharedValueIds, scrollViewProps }, ref) => {
    const photos = Array.isArray(candidate.photos) ? candidate.photos : [];
    const hometown = candidate.hometown?.trim();

    return (
      <Card padding={0} variant="elevated" style={styles.card}>
        <ScrollView
          ref={ref}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          <ProfilePhotoCarousel
            photos={photos}
            name={candidate.name}
            height={380}
            style={styles.photo}
          />

          <View style={styles.section}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>
                {candidate.name || 'Unknown'}{candidate.age ? `, ${candidate.age}` : ''}
              </Text>
              <View style={styles.locationWrap}>
                <Text style={styles.location} numberOfLines={1}>
                  {candidate.locationLabel ?? 'Location not set'}
                </Text>
              </View>
            </View>

            {hometown ? (
              <Text style={styles.subRow} numberOfLines={1}>
                Where they’re from: {hometown}
              </Text>
            ) : null}
          </View>

          {candidate.prompts && Array.isArray(candidate.prompts) && candidate.prompts.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prompts</Text>
              {candidate.prompts.slice(0, 2).map((p) => (
                <View key={p.id} style={styles.promptItem}>
                  <Text style={styles.promptQ} numberOfLines={1}>
                    {p.question || 'Prompt'}
                  </Text>
                  <Text style={styles.promptA} numberOfLines={2}>
                    {p.answer || ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Values</Text>

            <Text style={styles.valuesLabel}>Your top 5</Text>
            <View style={styles.tagsRow}>
              {currentUserTopValues.map((v) => {
                const shared = sharedValueIds.has(v.id);
                return (
                  <TagPill
                    key={`me-${v.id}`}
                    label={v.name}
                    size="sm"
                    style={shared ? styles.sharedTag : undefined}
                    textStyle={shared ? styles.sharedTagText : undefined}
                  />
                );
              })}
            </View>

            <Text style={[styles.valuesLabel, { marginTop: theme.spacing.base }]}>Their top 5</Text>
            <View style={styles.tagsRow}>
              {candidateTopValues.map((v) => {
                const shared = sharedValueIds.has(v.id);
                return (
                  <TagPill
                    key={`them-${v.id}`}
                    label={v.name}
                    size="sm"
                    style={shared ? styles.sharedTag : undefined}
                    textStyle={shared ? styles.sharedTagText : undefined}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>
      </Card>
    );
  }
);

DiscoverProfileCard.displayName = 'DiscoverProfileCard';

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.lg,
  },
  photo: {
    width: '100%',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  name: {
    flexShrink: 1,
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  locationWrap: {
    flexShrink: 1,
  },
  location: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  subRow: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  promptItem: {
    marginBottom: theme.spacing.base,
  },
  promptQ: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  promptA: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
  valuesLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  sharedTag: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  sharedTagText: {
    color: theme.colors.text,
  },
});

