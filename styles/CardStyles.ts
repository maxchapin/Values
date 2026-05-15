/**
 * Shared profile card styles for Discover and Profile screens.
 * Pixel-perfect match so Profile uses the same card design as Discover.
 */
import { StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme';
import { sectionCardStyles } from './sectionCardStyles';

export const CARD_PHOTO_HEIGHT = Math.round(Dimensions.get('window').height * 0.45);

export const cardStyles = StyleSheet.create({
  // Outer card (Discover card container)
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

  // Section spacing
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
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
  editButton: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  subRow: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  // Section cards (Details, Values, Prompts)
  sectionCard: {
    ...sectionCardStyles.card,
  },
  sectionCardTitle: {
    ...sectionCardStyles.cardTitle,
  },
  detailsCard: {
    marginTop: theme.spacing.sm,
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
  /** Clickable "Core Values" row on Profile card (collapsed, opens values editor). */
  valuesSectionTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: 0,
    paddingVertical: theme.spacing.xs,
    minHeight: 44,
  },
  coreValuesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  coreValuesChevron: {
    fontSize: 18,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
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
    borderWidth: 1,
    backgroundColor: theme.colors.primaryLight + '20',
  },
  sharedPillText: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.semibold,
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

  // Shared venue badge — shown on Discover cards when both users checked in
  venueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.success + '18',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.success + '40',
  },
  venueBadgeIcon: {
    fontSize: 13,
  },
  venueBadgeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
  },
});
