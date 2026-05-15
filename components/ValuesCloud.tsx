/**
 * ValuesCloud Component
 * Renders values in a structured two-section grid:
 * 1. Active selections (pinned top, flex-wrap chips)
 * 2. Available values (2-column alphabetized grid)
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { ValueItem, ValueTier } from '../types/value';
import { theme } from '../theme';

interface ValuesCloudProps {
  values: ValueItem[];
  onValuePress: (id: string) => void;
  blockedBubbleId?: string | null;
}

function getValueStylesByTier(tier: ValueTier): {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  textColor: string;
} {
  switch (tier) {
    case 'none':
      return {
        backgroundColor: theme.colors.backgroundSecondary,
        borderColor: theme.colors.border,
        borderWidth: 1,
        textColor: theme.colors.textSecondary,
      };
    case 'initial':
      return {
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.primary,
        borderWidth: 1,
        textColor: theme.colors.text,
      };
    case 'top20':
      return {
        backgroundColor: theme.colors.primaryLight + '22',
        borderColor: theme.colors.primaryLight,
        borderWidth: 1,
        textColor: theme.colors.primaryDark,
      };
    case 'top10':
      return {
        backgroundColor: theme.colors.primaryLight + '55',
        borderColor: theme.colors.primary,
        borderWidth: 1,
        textColor: theme.colors.primaryDark,
      };
    case 'top5':
      return {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primaryDark,
        borderWidth: 1,
        textColor: theme.colors.textInverse,
      };
    default:
      return {
        backgroundColor: theme.colors.backgroundSecondary,
        borderColor: theme.colors.border,
        borderWidth: 1,
        textColor: theme.colors.textSecondary,
      };
  }
}

const TIER_ORDER: Record<ValueTier, number> = {
  top5: 0,
  top10: 1,
  top20: 2,
  initial: 3,
  none: 4,
};

interface ValueBubbleProps {
  value: ValueItem;
  onPress: (id: string) => void;
  isBlocked?: boolean;
}

const ValueBubble: React.FC<ValueBubbleProps> = ({ value, onPress, isBlocked = false }) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const stylesByTier = getValueStylesByTier(value.tier);

  React.useEffect(() => {
    if (isBlocked) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [isBlocked, shakeAnim]);

  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      <TouchableOpacity
        onPress={() => onPress(value.id)}
        activeOpacity={0.7}
        style={[
          styles.bubble,
          {
            backgroundColor: stylesByTier.backgroundColor,
            borderColor: stylesByTier.borderColor,
            borderWidth: stylesByTier.borderWidth,
          },
        ]}
      >
        <Text style={[styles.bubbleText, { color: stylesByTier.textColor }]}>
          {value.label}
        </Text>
        {value.tier !== 'none' && (
          <Text style={[styles.removeIcon, { color: stylesByTier.textColor }]}>×</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ValuesCloud: React.FC<ValuesCloudProps> = ({
  values,
  onValuePress,
  blockedBubbleId,
}) => {
  const active = [...values]
    .filter((v) => v.tier !== 'none')
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.label.localeCompare(b.label));

  const available = [...values]
    .filter((v) => v.tier === 'none')
    .sort((a, b) => a.label.localeCompare(b.label));

  // Build 2-column rows for available values
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
      {active.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>YOUR SELECTIONS</Text>
          <View style={styles.activeGrid}>
            {active.map((v) => (
              <ValueBubble
                key={v.id}
                value={v}
                onPress={onValuePress}
                isBlocked={v.id === blockedBubbleId}
              />
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
                    <ValueBubble
                      value={v}
                      onPress={onValuePress}
                      isBlocked={v.id === blockedBubbleId}
                    />
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
  },
  bubbleText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  removeIcon: {
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.7,
  },
});
