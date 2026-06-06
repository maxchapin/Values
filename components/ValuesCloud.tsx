/**
 * ValuesCloud Component
 * Binary selected/unselected grid. No tiers or ranking.
 * Selected values pinned to the top; available values in a 2-column grid below.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ValueItem } from '../types/value';
import { theme } from '../theme';

interface ValuesCloudProps {
  values: ValueItem[];
  selectedValueIds: string[];
  onToggle: (id: string) => void;
  maxReached: boolean;
}

interface ValueBubbleProps {
  value: ValueItem;
  isSelected: boolean;
  onPress: (id: string) => void;
}

const ValueBubble: React.FC<ValueBubbleProps> = ({ value, isSelected, onPress }) => (
  <TouchableOpacity
    onPress={() => onPress(value.id)}
    activeOpacity={0.7}
    style={[styles.bubble, isSelected ? styles.bubbleSelected : styles.bubbleUnselected]}
  >
    <Text style={[styles.bubbleText, isSelected ? styles.bubbleTextSelected : styles.bubbleTextUnselected]}>
      {value.label}
    </Text>
    {isSelected && <Text style={styles.removeIcon}>×</Text>}
  </TouchableOpacity>
);

export const ValuesCloud: React.FC<ValuesCloudProps> = ({
  values,
  selectedValueIds,
  onToggle,
  maxReached,
}) => {
  const selectedSet = new Set(selectedValueIds);

  const selected = [...values]
    .filter((v) => selectedSet.has(v.id))
    .sort((a, b) => a.label.localeCompare(b.label));

  const available = [...values]
    .filter((v) => !selectedSet.has(v.id))
    .sort((a, b) => a.label.localeCompare(b.label));

  const availableRows: ValueItem[][] = [];
  for (let i = 0; i < available.length; i += 2) {
    availableRows.push(available.slice(i, i + 2));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {maxReached && (
        <View style={styles.capBanner}>
          <Text style={styles.capBannerText}>10 values selected — remove one to add another</Text>
        </View>
      )}

      {selected.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>YOUR SELECTIONS</Text>
          <View style={styles.activeGrid}>
            {selected.map((v) => (
              <ValueBubble key={v.id} value={v} isSelected onPress={onToggle} />
            ))}
          </View>
        </View>
      )}

      {available.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ALL VALUES</Text>
          <View style={styles.twoColGrid}>
            {availableRows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.gridRow}>
                {row.map((v) => (
                  <View key={v.id} style={styles.gridCell}>
                    <ValueBubble value={v} isSelected={false} onPress={onToggle} />
                  </View>
                ))}
                {row.length === 1 && <View style={styles.gridCell} />}
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing.xl,
  },
  capBanner: {
    backgroundColor: theme.colors.warning + '22',
    borderRadius: theme.borderRadius.base,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.warning + '44',
  },
  capBannerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  activeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  twoColGrid: {
    gap: theme.spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  gridCell: {
    flex: 1,
  },
  bubble: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    borderWidth: 1,
  },
  bubbleSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  bubbleUnselected: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: theme.colors.border,
  },
  bubbleText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  bubbleTextSelected: {
    color: theme.colors.textInverse,
  },
  bubbleTextUnselected: {
    color: theme.colors.textSecondary,
  },
  removeIcon: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textInverse,
    opacity: 0.8,
  },
});
