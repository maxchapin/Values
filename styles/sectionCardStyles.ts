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
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 } as const,
    shadowOpacity: 0.05 as number,
    shadowRadius: 3 as number,
    elevation: 2 as number,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
} as const;
