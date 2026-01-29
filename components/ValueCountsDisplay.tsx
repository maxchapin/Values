import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface ValueCountsDisplayProps {
  anyCount: number;
  top20Count: number;
  top10Count: number;
  top5Count: number;
}

/**
 * ValueCountsDisplay Component
 * Shows tier counts in format: Any: X | Top 20: X/20 | Top 10: X/10 | Top 5: X/5
 */
export const ValueCountsDisplay: React.FC<ValueCountsDisplayProps> = ({
  anyCount,
  top20Count,
  top10Count,
  top5Count,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.countRow}>
        <View style={styles.countItem}>
          <Text style={styles.countLabel}>Any</Text>
          <Text style={styles.countValue}>{anyCount}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.countItem}>
          <Text style={styles.countLabel}>Top 20</Text>
          <Text style={[styles.countValue, top20Count >= 20 && styles.countValueFull]}>
            {top20Count}/20
          </Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.countItem}>
          <Text style={styles.countLabel}>Top 10</Text>
          <Text style={[styles.countValue, top10Count >= 10 && styles.countValueFull]}>
            {top10Count}/10
          </Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.countItem}>
          <Text style={styles.countLabel}>Top 5</Text>
          <Text style={[styles.countValue, top5Count >= 5 && styles.countValueFull]}>
            {top5Count}/5
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.base,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  countItem: {
    alignItems: 'center',
    flex: 1,
  },
  countLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countValue: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.bold,
  },
  countValueFull: {
    color: theme.colors.primary,
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.sm,
  },
});
