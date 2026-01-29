/**
 * ValuesCloud Component
 * Renders values as pill-shaped bubbles in a word cloud layout
 * with tier-based styling and micro-interactions
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
}

/**
 * Get tier-based styles for a value bubble
 */
function getValueStylesByTier(tier: ValueTier): {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  textColor: string;
} {
  switch (tier) {
    case 'none':
      return {
        backgroundColor: theme.colors.backgroundSecondary, // light gray
        borderColor: theme.colors.border,
        borderWidth: 1,
        textColor: theme.colors.textSecondary, // dark gray
      };

    case 'initial':
      return {
        backgroundColor: theme.colors.background, // soft neutral
        borderColor: theme.colors.primary,
        borderWidth: 1.5,
        textColor: theme.colors.text, // dark neutral
      };

    case 'top20':
      return {
        backgroundColor: '#E3F2FD', // very pale accent tint (light blue)
        borderColor: theme.colors.primaryLight,
        borderWidth: 1,
        textColor: theme.colors.text, // dark neutral
      };

    case 'top10':
      return {
        backgroundColor: '#90CAF9', // medium accent tint (medium blue)
        borderColor: theme.colors.primary,
        borderWidth: 1.5,
        textColor: theme.colors.textInverse, // white for contrast
      };

    case 'top5':
      return {
        backgroundColor: theme.colors.primary, // strongest/saturated accent
        borderColor: theme.colors.primaryDark,
        borderWidth: 2,
        textColor: theme.colors.textInverse, // white
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

/**
 * Sort values by tier importance for render order
 * Order: top5 → top10 → top20 → initial → none
 */
function sortValuesByTier(values: ValueItem[]): ValueItem[] {
  const tierOrder: Record<ValueTier, number> = {
    top5: 0,
    top10: 1,
    top20: 2,
    initial: 3,
    none: 4,
  };

  return [...values].sort((a, b) => {
    return tierOrder[a.tier] - tierOrder[b.tier];
  });
}

interface ValueBubbleProps {
  value: ValueItem;
  onPress: (id: string) => void;
}

const ValueBubble: React.FC<ValueBubbleProps> = ({ value, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const stylesByTier = getValueStylesByTier(value.tier);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.03,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    onPress(value.id);
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={[
          styles.bubble,
          {
            backgroundColor: stylesByTier.backgroundColor,
            borderColor: stylesByTier.borderColor,
            borderWidth: stylesByTier.borderWidth,
          },
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            {
              color: stylesByTier.textColor,
            },
          ]}
        >
          {value.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ValuesCloud: React.FC<ValuesCloudProps> = ({
  values,
  onValuePress,
}) => {
  // Sort values by tier importance (top5 first, then top10, etc.)
  const sortedValues = sortValuesByTier(values);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.cloud}>
        {sortedValues.map((value) => (
          <ValueBubble
            key={value.id}
            value={value}
            onPress={onValuePress}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.base,
  },
  cloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: theme.borderRadius.full, // Pill/oval shape
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    // Smooth color transitions handled by React Native's default behavior
  },
  bubbleText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
