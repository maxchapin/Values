import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
  onChangeEnd?: (next: [number, number]) => void;
  style?: ViewStyle;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function roundToStep(n: number, step: number, min: number): number {
  const snapped = Math.round((n - min) / step) * step + min;
  return snapped;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  onChangeEnd,
  style,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const activeThumbRef = useRef<'min' | 'max' | null>(null);
  const latestValueRef = useRef<[number, number]>(value);
  latestValueRef.current = value;

  const onTrackLayout = (e: LayoutChangeEvent): void => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setTrackWidth(w);
  };

  const positions = useMemo(() => {
    const [vMin, vMax] = latestValueRef.current;
    const range = Math.max(1, max - min);
    const toX = (v: number) => ((v - min) / range) * trackWidth;
    return {
      minX: toX(vMin),
      maxX: toX(vMax),
    };
  }, [min, max, trackWidth, value[0], value[1]]);

  const updateFromX = (thumb: 'min' | 'max', x: number, isEnd: boolean): void => {
    if (trackWidth <= 0) return;
    const range = Math.max(1, max - min);
    const ratio = clamp(x / trackWidth, 0, 1);
    let nextVal = min + ratio * range;
    nextVal = roundToStep(nextVal, step, min);
    nextVal = clamp(nextVal, min, max);

    const [curMin, curMax] = latestValueRef.current;
    let next: [number, number] =
      thumb === 'min'
        ? [Math.min(nextVal, curMax), curMax]
        : [curMin, Math.max(nextVal, curMin)];

    // snap to step (again) to avoid drift
    next = [
      clamp(roundToStep(next[0], step, min), min, max),
      clamp(roundToStep(next[1], step, min), min, max),
    ];

    onChange(next);
    if (isEnd) onChangeEnd?.(next);
  };

  const panMin = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          activeThumbRef.current = 'min';
        },
        onPanResponderMove: (_evt, gesture) => {
          updateFromX('min', positions.minX + gesture.dx, false);
        },
        onPanResponderRelease: (_evt, gesture) => {
          updateFromX('min', positions.minX + gesture.dx, true);
          activeThumbRef.current = null;
        },
      }),
    // positions is used as starting point
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positions.minX, trackWidth, min, max, step]
  );

  const panMax = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          activeThumbRef.current = 'max';
        },
        onPanResponderMove: (_evt, gesture) => {
          updateFromX('max', positions.maxX + gesture.dx, false);
        },
        onPanResponderRelease: (_evt, gesture) => {
          updateFromX('max', positions.maxX + gesture.dx, true);
          activeThumbRef.current = null;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positions.maxX, trackWidth, min, max, step]
  );

  const thumbRadius = 12;
  const minLeft = positions.minX - thumbRadius;
  const maxLeft = positions.maxX - thumbRadius;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.trackWrap} onLayout={onTrackLayout}>
        <View style={styles.track} />
        <View
          style={[
            styles.trackActive,
            {
              left: Math.min(positions.minX, positions.maxX),
              width: Math.max(0, positions.maxX - positions.minX),
            },
          ]}
        />

        {/* Min thumb */}
        <View
          {...panMin.panHandlers}
          style={[
            styles.thumb,
            { left: minLeft, zIndex: activeThumbRef.current === 'min' ? 2 : 1 },
          ]}
        />

        {/* Max thumb */}
        <View
          {...panMax.panHandlers}
          style={[
            styles.thumb,
            { left: maxLeft, zIndex: activeThumbRef.current === 'max' ? 2 : 1 },
          ]}
        />
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

