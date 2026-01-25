import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface SingleValueSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (next: number) => void;
  onChangeEnd?: (next: number) => void;
  style?: ViewStyle;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function roundToStep(n: number, step: number, min: number): number {
  const snapped = Math.round((n - min) / step) * step + min;
  return snapped;
}

export const SingleValueSlider: React.FC<SingleValueSliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  onChangeEnd,
  style,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const latestValueRef = useRef<number>(value);
  latestValueRef.current = value;

  const onTrackLayout = (e: LayoutChangeEvent): void => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setTrackWidth(w);
  };

  const posX = useMemo(() => {
    const range = Math.max(1, max - min);
    return ((latestValueRef.current - min) / range) * trackWidth;
  }, [min, max, trackWidth, value]);

  const updateFromX = (x: number, isEnd: boolean): void => {
    if (trackWidth <= 0) return;
    const range = Math.max(1, max - min);
    const ratio = clamp(x / trackWidth, 0, 1);
    let nextVal = min + ratio * range;
    nextVal = clamp(roundToStep(nextVal, step, min), min, max);
    onChange(nextVal);
    if (isEnd) onChangeEnd?.(nextVal);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gesture) => {
          updateFromX(posX + gesture.dx, false);
        },
        onPanResponderRelease: (_evt, gesture) => {
          updateFromX(posX + gesture.dx, true);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posX, trackWidth, min, max, step]
  );

  const thumbRadius = 12;
  const left = posX - thumbRadius;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.trackWrap} onLayout={onTrackLayout}>
        <View style={styles.track} />
        <View style={[styles.trackActive, { width: Math.max(0, posX) }]} />
        <View {...pan.panHandlers} style={[styles.thumb, { left }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: theme.spacing.sm,
  },
  trackWrap: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
  trackActive: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
});

