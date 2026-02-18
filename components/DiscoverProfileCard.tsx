import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ScrollViewProps, Pressable } from 'react-native';
import { Card } from './Card';
import { TagPill } from './TagPill';
import { ProfilePhotoCarousel, type ProfilePhotoCarouselRef } from './ProfilePhotoCarousel';
import { MatchScoreInfoModal } from './MatchScoreInfoModal';
import { ValuesExplanationModal } from './ValuesExplanationModal';
import { theme } from '../theme';
import { sectionCardStyles } from '../styles/sectionCardStyles';
import { formatDistanceMiles } from '../utils/geo';
import { User, Gender } from '../types/user';

/** Display label for card; null means hide (e.g. prefer-not-to-say). */
function getGenderDisplayLabel(gender: Gender | undefined): string | null {
  if (!gender) return null;
  if (gender === 'male') return 'Man';
  if (gender === 'female') return 'Woman';
  if (gender === 'non-binary') return 'Nonbinary';
  return null; // prefer-not-to-say
}

export interface CandidateValueItem {
  id: string;
  label: string;
}

interface DiscoverProfileCardProps {
  candidate: User;
  /** Candidate's values to show (e.g. top 5 or top 10 from valuesProfile). */
  candidateValueItems?: CandidateValueItem[];
  /** Value IDs that are shared with current user (from match.sharedValues). Used for highlight. */
  sharedValueIds?: Set<string>;
  /** Match percentage 0–100 from Model 3. Shown only in 'other' mode when provided. */
  similarityScore?: number;
  /** Count of shared values (current user ∩ candidate). Shown only in 'other' mode when provided. */
  sharedValuesCount?: number;
  /** Human-readable explanation lines from match buckets (strong / partial / friction). */
  explanationLines?: string[];
  /** Distance in miles from viewer to candidate (from match or computed). Null/undefined = unavailable. */
  distanceMiles?: number | null;
  mode?: 'self' | 'other';
  scrollViewProps?: Omit<ScrollViewProps, 'ref'>;
}

function getCandidateDisplayValues(
  candidate: User,
  candidateValueItems?: CandidateValueItem[]
): CandidateValueItem[] {
  if (candidateValueItems && candidateValueItems.length > 0) {
    return candidateValueItems;
  }
  if (candidate.valuesProfile?.top5Ids && candidate.valuesProfile.allValues) {
    return candidate.valuesProfile.top5Ids
      .slice(0, 10)
      .map((id) => {
        const v = candidate.valuesProfile!.allValues.find((item) => item.id === id);
        return v ? { id: v.id, label: v.label } : null;
      })
      .filter((v): v is CandidateValueItem => v !== null);
  }
  return [];
}

export const DiscoverProfileCard = React.forwardRef<ScrollView, DiscoverProfileCardProps>(
  (
    {
      candidate,
      candidateValueItems,
      sharedValueIds = new Set(),
      similarityScore,
      sharedValuesCount,
      explanationLines,
      distanceMiles,
      mode = 'other',
      scrollViewProps,
    },
    ref
  ) => {
    const photos = Array.isArray(candidate.photos) ? candidate.photos : [];
    const hometown = candidate.hometown?.trim();
    const isSelfMode = mode === 'self';
    const displayValues = getCandidateDisplayValues(candidate, candidateValueItems);
    const photoCarouselRef = useRef<ProfilePhotoCarouselRef>(null);
    const showMatchScore =
      !isSelfMode &&
      (typeof similarityScore === 'number' || typeof sharedValuesCount === 'number');
    const score = typeof similarityScore === 'number' ? similarityScore : 0;
    const matchHeadline = `${score}% Match`;
    const [showScoreInfoModal, setShowScoreInfoModal] = useState(false);
    const [showValuesExplanationModal, setShowValuesExplanationModal] = useState(false);
    const genderLabel = getGenderDisplayLabel(candidate.gender);
    const distanceLabel =
      distanceMiles != null && Number.isFinite(distanceMiles)
        ? formatDistanceMiles(distanceMiles)
        : null;

    // Reset photo carousel to first image whenever the active candidate changes (Like/Pass or index change)
    useEffect(() => {
      photoCarouselRef.current?.resetToFirstPhoto();
    }, [candidate.id]);

    return (
      <Card padding={0} variant="elevated" style={styles.card}>
        <MatchScoreInfoModal
          visible={showScoreInfoModal}
          onClose={() => setShowScoreInfoModal(false)}
        />
        <ValuesExplanationModal
          visible={showValuesExplanationModal}
          onClose={() => setShowValuesExplanationModal(false)}
          lines={explanationLines ?? []}
        />
        <ScrollView
          ref={ref}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          <ProfilePhotoCarousel
            ref={photoCarouselRef}
            photos={photos}
            name={candidate.name}
            height={theme.spacing['4xl'] * 6}
            style={styles.photo}
          />

          <View style={styles.section}>
            {/* Name + age (left), X% Match (right) */}
            <View style={styles.nameMatchRow}>
              <Text style={styles.name} numberOfLines={1}>
                {candidate.name || 'Unknown'}{candidate.age != null ? `, ${candidate.age}` : ''}
              </Text>
              {showMatchScore ? (
                <View style={styles.matchScoreRow}>
                  <View style={styles.matchScorePill}>
                    <Text style={styles.matchScoreText}>{matchHeadline}</Text>
                    <Pressable
                      style={styles.matchScoreInfoButton}
                      onPress={() => setShowScoreInfoModal(true)}
                      accessibilityLabel="Learn how match score is calculated"
                      accessibilityRole="button"
                      accessibilityHint="Opens explanation of how match scores are calculated"
                    >
                      <Text style={styles.matchScoreInfoIcon}>ℹ️</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>

            {hometown ? (
              <Text style={styles.subRow} numberOfLines={1}>
                Where they're from: {hometown}
              </Text>
            ) : null}
          </View>

          {/* Details box: same wrapper and item format as Prompts */}
          <View style={[styles.section, styles.sectionCard, styles.detailsCard]}>
            <Text style={styles.sectionCardTitle}>Details</Text>
            <View style={styles.detailsOneLine}>
              <Text style={styles.detailsInline} numberOfLines={1}>
                {candidate.locationLabel ?? 'Location not set'}
              </Text>
              {genderLabel != null ? (
                <>
                  <Text style={styles.detailsSeparator}> · </Text>
                  <Text style={styles.detailsInline} numberOfLines={1}>{genderLabel}</Text>
                </>
              ) : null}
            </View>
            {/* Distance commented out for now
            <View style={styles.promptItem}>
              <Text style={styles.promptQ} numberOfLines={1}>Distance</Text>
              <Text style={styles.promptA} numberOfLines={1}>
                {distanceLabel ? `${distanceLabel} away` : 'Distance unavailable'}
              </Text>
            </View>
            */}
          </View>

          {/* Values box: same wrapper as Prompts */}
          <View style={[styles.section, styles.sectionCard, styles.valuesCard]}>
            <View style={styles.valuesCardHeader}>
              <Text style={styles.sectionCardTitle}>Values</Text>
                {!isSelfMode && (explanationLines?.length ?? 0) > 0 ? (
                  <Pressable
                    style={styles.valuesInfoButton}
                    onPress={() => setShowValuesExplanationModal(true)}
                    accessibilityLabel="What these values mean"
                    accessibilityRole="button"
                    accessibilityHint="Opens explanation of how your values compare"
                  >
                    <Text style={styles.matchScoreInfoIcon}>ℹ️</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                style={styles.valuesContentTouchable}
                onPress={() => !isSelfMode && (explanationLines?.length ?? 0) > 0 && setShowValuesExplanationModal(true)}
                accessibilityLabel="Values. Double tap to open explanation."
                accessibilityRole="button"
              >
                {isSelfMode ? (
                  displayValues.length > 0 ? (
                    <View style={styles.tagsRow}>
                      {displayValues.map((v) => (
                        <TagPill key={v.id} label={v.label} size="sm" />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.valuesLabel}>No values selected</Text>
                  )
                ) : (
                  displayValues.length > 0 ? (
                    <View style={styles.tagsRow}>
                      {displayValues.map((v) => {
                        const shared = sharedValueIds.has(v.id);
                        return (
                          <TagPill
                            key={v.id}
                            label={v.label}
                            size="sm"
                            style={shared ? styles.sharedPill : undefined}
                            textStyle={shared ? styles.sharedPillText : undefined}
                          />
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.valuesLabel}>No values selected</Text>
                  )
                )}
              </Pressable>
            </View>

          {candidate.prompts && Array.isArray(candidate.prompts) && candidate.prompts.length > 0 ? (
            <View style={[styles.section, styles.sectionCard, styles.promptsCard]}>
              <Text style={styles.sectionCardTitle}>Prompts</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  nameMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  matchScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 0,
  },
  detailsCard: {
    marginTop: theme.spacing.sm,
  },
  matchScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primaryLight + '25',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  matchScoreText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  matchScoreInfoButton: {
    minWidth: 28,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchScoreInfoIcon: {
    fontSize: 16,
    opacity: 0.9,
  },
  detailsOneLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  detailsInline: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  detailsSeparator: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  sectionCard: {
    ...sectionCardStyles.card,
  },
  sectionCardTitle: {
    ...sectionCardStyles.cardTitle,
  },
  valuesCard: {
    marginTop: theme.spacing.sm,
  },
  promptsCard: {
    marginTop: theme.spacing.sm,
  },
  valuesCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  valuesInfoButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valuesContentTouchable: {
    marginTop: 0,
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
  sharedPill: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.primaryLight + '20',
  },
  sharedPillText: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

