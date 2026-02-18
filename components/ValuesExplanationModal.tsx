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

interface ValuesExplanationModalProps {
  visible: boolean;
  onClose: () => void;
  /** Human-readable explanation lines (e.g. from formatExplanationLines). */
  lines: string[];
}

const TITLE = 'What These Values Mean';

export const ValuesExplanationModal: React.FC<ValuesExplanationModalProps> = ({
  visible,
  onClose,
  lines,
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
      accessibilityLabel={TITLE}
    >
      <View style={styles.container}>
        <Pressable
          style={styles.overlay}
          onPress={onClose}
          accessibilityLabel="Close values explanation"
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
              accessibilityLabel={`${TITLE}. ${lines.join(' ')}`}
            >
              <Text style={styles.title}>{TITLE}</Text>
              {lines.length > 0 ? (
                <View style={styles.lineList}>
                  {lines.map((line, i) => (
                    <Text key={i} style={styles.line}>
                      {line}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.line}>
                  No detailed explanation available for this match.
                </Text>
              )}
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>Close</Text>
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
  lineList: {
    marginBottom: theme.spacing.lg,
  },
  line: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.xs,
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  closeButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
});
