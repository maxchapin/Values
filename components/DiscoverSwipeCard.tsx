/**
 * Wraps the Discover card in a Tinder-style swipe layer.
 * Swipe right = like, swipe left = pass. Uses the same onLike/onPass callbacks as the action bar buttons.
 *
 * Tweakable constants (below): SWIPE_THRESHOLD_PX, ROTATION_DEG, and withSpring config control feel.
 */

import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// --- Tweak these to adjust swipe behavior ---
/** Horizontal distance (px) to trigger like (right) or pass (left). */
const SWIPE_THRESHOLD_PX = 100;
/** Max rotation (degrees) of the card while dragging. */
const ROTATION_DEG = 12;
/** Spring config for throw/snap animation. */
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

interface DiscoverSwipeCardProps {
  children: React.ReactNode;
  onLike: () => void;
  onPass: () => void;
  disabled?: boolean;
  /** When this changes (e.g. candidate id), card position is reset so the next card appears centered. */
  cardKey?: string;
}

export const DiscoverSwipeCard: React.FC<DiscoverSwipeCardProps> = ({
  children,
  onLike,
  onPass,
  disabled = false,
  cardKey,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [cardKey]);

  const triggerLike = useCallback(() => {
    if (!disabled) onLike();
  }, [disabled, onLike]);
  const triggerPass = useCallback(() => {
    if (!disabled) onPass();
  }, [disabled, onPass]);

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    // Prefer vertical scroll when user scrolls; activate pan after horizontal movement.
    .activeOffsetX([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      const tx = translateX.value;
      const vx = e.velocityX;
      const threshold = SWIPE_THRESHOLD_PX;
      if (tx > threshold || (tx > 0 && vx > 200)) {
        translateX.value = withTiming(400, { duration: 180 }, () => {
          runOnJS(triggerLike)();
        });
        translateY.value = withSpring(0, SPRING_CONFIG);
      } else if (tx < -threshold || (tx < 0 && vx < -200)) {
        translateX.value = withTiming(-400, { duration: 180 }, () => {
          runOnJS(triggerPass)();
        });
        translateY.value = withSpring(0, SPRING_CONFIG);
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rot = (translateX.value / 300) * (ROTATION_DEG * (Math.PI / 180));
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rot}rad` },
      ],
    };
  });

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, animatedStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minHeight: 0,
  },
  card: {
    flex: 1,
  },
});
