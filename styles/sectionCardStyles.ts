/**
 * Shared section card styles for Profile and Discover screens.
 * Use with StyleSheet.create: { card: { ...sectionCardStyles.card } }
 */
import { theme } from '../theme';

export const sectionCardStyles = {
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
} as const;
