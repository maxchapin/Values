import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { theme } from '../theme';

interface MatchScoreInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const BULLETS = [
  'We compare your values with theirs across everything you both care about.',
  'Each value contributes based on how much the less-invested person prioritizes it.',
  'When you both prioritize a value highly (top 5 or top 10), it gets a boost.',
  'This rewards shared priorities and surfaces where you align or differ.',
];

export const MatchScoreInfoModal: React.FC<MatchScoreInfoModalProps> = ({
  visible,
  onClose,
}) => {
  const { width } = useWindowDimensions();
  const cardMaxWidth = Math.min(width - theme.spacing.xl * 2, 340);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(24);
    }
  }, [visible, fadeAnim, slideAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
      accessibilityLabel="How match scores work"
    >
      <View style={styles.container}>
        <Pressable
          style={styles.overlay}
          onPress={onClose}
          accessibilityLabel="Close match score explanation"
          accessibilityRole="button"
        />
        <View style={styles.centered} pointerEvents="box-none">
          <View style={styles.cardPressable}>
          <Animated.View
            style={[
              styles.card,
              {
                maxWidth: cardMaxWidth,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
            accessibilityLabel="How match scores work. We compare your values with theirs. Each value contributes based on how much the less-invested person prioritizes it. When you both prioritize a value highly, it gets a boost."
          >
            <Text style={styles.title}>How Match Scores Work</Text>
            <Text style={styles.body}>
              We compare your top values with theirs:
            </Text>
            <View style={styles.bulletList}>
              {BULLETS.map((line, i) => (
                <Text key={i} style={styles.bullet}>
                  • {line}
                </Text>
              ))}
            </View>
            <Pressable
              style={styles.gotItButton}
              onPress={onClose}
              accessibilityLabel="Got it"
              accessibilityRole="button"
            >
              <Text style={styles.gotItText}>Got it</Text>
            </Pressable>
          </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  cardPressable: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    ...theme.shadows.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  body: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
    marginBottom: theme.spacing.sm,
  },
  bulletList: {
    marginBottom: theme.spacing.lg,
  },
  bullet: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.xs,
  },
  gotItButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  gotItText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
});
