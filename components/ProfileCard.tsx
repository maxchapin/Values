/**
 * Reusable profile card used by both Discover and Profile screens.
 * Same visual design: photo carousel → name → Details → Values → Prompts.
 * Discover: pass match props (similarityScore, sharedValueIds, etc.); no edit button.
 * Profile: pass showEditButton + onEditPress; no match score.
 */
import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ScrollViewProps, Pressable } from 'react-native';
import { Card } from './Card';
import { TagPill } from './TagPill';
import { ProfilePhotoCarousel, type ProfilePhotoCarouselRef } from './ProfilePhotoCarousel';
import { ValuesExplanationModal } from './ValuesExplanationModal';
import { cardStyles, CARD_PHOTO_HEIGHT } from '../styles/CardStyles';
import type { User, Gender } from '../types/user';

export interface CandidateValueItem {
  id: string;
  label: string;
}

function getGenderDisplayLabel(gender: Gender | undefined): string | null {
  if (!gender) return null;
  if (gender === 'male') return 'Man';
  if (gender === 'female') return 'Woman';
  if (gender === 'non-binary') return 'Nonbinary';
  return null;
}

function getCandidateDisplayValues(
  candidate: User,
  candidateValueItems?: CandidateValueItem[]
): CandidateValueItem[] {
  if (candidateValueItems && candidateValueItems.length > 0) {
    return candidateValueItems;
  }
  return candidate.valuesProfile?.selectedValues ?? [];
}

export interface ProfileCardProps {
  user: User;
  candidateValueItems?: CandidateValueItem[];
  sharedValueIds?: Set<string>;
  explanationLines?: string[];
  distanceMiles?: number | null;
  /** Venue both users recently checked into. Shows a badge when set. */
  sharedVenueName?: string;
  /** Show Edit button on card (Profile tab). */
  showEditButton?: boolean;
  onEditPress?: () => void;
  /** When set, Core Values section is tappable and opens values editor (Profile tab). */
  onValuesPress?: () => void;
  scrollViewProps?: Omit<ScrollViewProps, 'ref'>;
}

export const ProfileCard = forwardRef<ScrollView, ProfileCardProps>(
  (
    {
      user,
      candidateValueItems,
      sharedValueIds = new Set(),
      explanationLines,
      distanceMiles,
      sharedVenueName,
      showEditButton = false,
      onEditPress,
      onValuesPress,
      scrollViewProps,
    },
    ref
  ) => {
    const photos = Array.isArray(user.photos) ? user.photos : [];
    const hometown = user.hometown?.trim();
    const displayValues = getCandidateDisplayValues(user, candidateValueItems);
    const photoCarouselRef = useRef<ProfilePhotoCarouselRef>(null);
    const isSelfMode = showEditButton;
    const [showValuesExplanationModal, setShowValuesExplanationModal] = useState(false);
    const genderLabel = getGenderDisplayLabel(user.gender);

    useEffect(() => {
      photoCarouselRef.current?.resetToFirstPhoto();
    }, [user.id]);

    return (
      <Card padding={0} variant="elevated" style={cardStyles.card}>
        <ValuesExplanationModal
          visible={showValuesExplanationModal}
          onClose={() => setShowValuesExplanationModal(false)}
          lines={explanationLines ?? []}
        />
        <ScrollView
          ref={ref}
          style={cardStyles.scroll}
          contentContainerStyle={cardStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          <ProfilePhotoCarousel
            ref={photoCarouselRef}
            photos={photos}
            name={user.name}
            height={CARD_PHOTO_HEIGHT}
            style={cardStyles.photo}
          />

          <View style={cardStyles.section}>
            <View style={cardStyles.nameMatchRow}>
              <Text style={cardStyles.name} numberOfLines={1}>
                {user.name || 'Unknown'}
                {user.age != null ? `, ${user.age}` : ''}
              </Text>
              {showEditButton && onEditPress ? (
                <Pressable
                  style={cardStyles.editButton}
                  onPress={onEditPress}
                  accessibilityLabel="Edit profile"
                  accessibilityRole="button"
                >
                  <Text style={cardStyles.editButtonText}>Edit</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {!isSelfMode && sharedVenueName ? (
            <View style={cardStyles.section}>
              <View style={cardStyles.venueBadge}>
                <Text style={cardStyles.venueBadgeIcon}>📍</Text>
                <Text style={cardStyles.venueBadgeText} numberOfLines={1}>
                  You were both at {sharedVenueName} this week
                </Text>
              </View>
            </View>
          ) : null}

          <View style={[cardStyles.section, cardStyles.sectionCard, cardStyles.detailsCard]}>
            <Text style={cardStyles.sectionCardTitle}>Details</Text>
            <View style={cardStyles.detailsOneLine}>
              <Text style={cardStyles.detailsInline} numberOfLines={1}>
                {user.locationLabel ?? 'Location not set'}
              </Text>
              {genderLabel != null ? (
                <>
                  <Text style={cardStyles.detailsSeparator}> · </Text>
                  <Text style={cardStyles.detailsInline} numberOfLines={1}>
                    {genderLabel}
                  </Text>
                </>
              ) : null}
              {hometown ? (
                <>
                  <Text style={cardStyles.detailsSeparator}> · </Text>
                  <Text style={cardStyles.detailsInline} numberOfLines={1}>
                    From {hometown}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          {isSelfMode || displayValues.length > 0 ? (
          <View style={[cardStyles.section, cardStyles.sectionCard, cardStyles.valuesCard]}>
            {isSelfMode && onValuesPress ? (
              <Pressable
                style={cardStyles.valuesSectionTouchable}
                onPress={onValuesPress}
                accessibilityLabel="Core Values. Tap to edit."
                accessibilityRole="button"
              >
                <View style={cardStyles.coreValuesTitleRow}>
                  <Text style={cardStyles.sectionCardTitle}>Core Values</Text>
                  <Text style={cardStyles.coreValuesChevron}>›</Text>
                </View>
                {displayValues.length > 0 ? (
                  <View style={cardStyles.tagsRow}>
                    {displayValues.slice(0, 3).map((v) => (
                      <TagPill key={v.id} label={v.label} size="sm" />
                    ))}
                    {displayValues.length > 3 ? (
                      <Text style={cardStyles.valuesLabel}>+{displayValues.length - 3} more</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={cardStyles.valuesLabel}>Tap to add values</Text>
                )}
              </Pressable>
            ) : (
              <>
                <View style={cardStyles.valuesCardHeader}>
                  <Text style={cardStyles.sectionCardTitle}>Values</Text>
                  {!isSelfMode && (explanationLines?.length ?? 0) > 0 ? (
                    <Pressable
                      style={cardStyles.valuesInfoButton}
                      onPress={() => setShowValuesExplanationModal(true)}
                      accessibilityLabel="What these values mean"
                      accessibilityRole="button"
                    >
                      <Text style={cardStyles.matchScoreInfoIcon}>ℹ️</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  style={cardStyles.valuesContentTouchable}
                  onPress={() =>
                    !isSelfMode &&
                    (explanationLines?.length ?? 0) > 0 &&
                    setShowValuesExplanationModal(true)
                  }
                  accessibilityLabel="Values"
                  accessibilityRole="button"
                >
                  {displayValues.length > 0 ? (
                    <View style={cardStyles.tagsRow}>
                      {displayValues.map((v) => {
                        const shared = sharedValueIds.has(v.id);
                        return (
                          <TagPill
                            key={v.id}
                            label={v.label}
                            size="sm"
                            style={shared ? cardStyles.sharedPill : undefined}
                            textStyle={shared ? cardStyles.sharedPillText : undefined}
                          />
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={cardStyles.valuesLabel}>No values selected</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
          ) : null}

          {user.prompts &&
          Array.isArray(user.prompts) &&
          user.prompts.length > 0 ? (
            <View style={[cardStyles.section, cardStyles.sectionCard, cardStyles.promptsCard]}>
              <Text style={cardStyles.sectionCardTitle}>Prompts</Text>
              {user.prompts.slice(0, 2).map((p) => (
                <View key={p.id} style={cardStyles.promptItem}>
                  <Text style={cardStyles.promptQ} numberOfLines={1}>
                    {p.question || 'Prompt'}
                  </Text>
                  <Text style={cardStyles.promptA} numberOfLines={2}>
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

ProfileCard.displayName = 'ProfileCard';
