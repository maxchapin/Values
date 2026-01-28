import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  ViewStyle,
} from 'react-native';
import { theme } from '../theme';

interface ProfilePhotoCarouselProps {
  /** Photo URIs. First is main; multiple show as swipeable carousel. */
  photos: string[];
  name?: string;
  height?: number;
  style?: ViewStyle;
}

export const ProfilePhotoCarousel: React.FC<ProfilePhotoCarouselProps> = ({
  photos,
  name,
  height = 320,
  style,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setLayoutWidth(w);
  }, []);

  const safePhotos = Array.isArray(photos) ? photos : [];
  const initial = (name?.trim()?.[0] || '?').toUpperCase();

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const w = layoutWidth > 0 ? layoutWidth : 300;
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / w);
      if (index >= 0 && index < safePhotos.length) {
        setPage(index);
      }
    },
    [layoutWidth, safePhotos.length]
  );

  if (safePhotos.length === 0) {
    return (
      <View style={[styles.placeholder, { height }, style]}>
        <Text style={styles.initial}>{initial}</Text>
        <Text style={styles.placeholderText}>No photo</Text>
      </View>
    );
  }

  if (safePhotos.length === 1) {
    return (
      <View style={[styles.container, { height }, style]} onLayout={onLayout}>
        <Image source={{ uri: safePhotos[0] }} style={styles.image} resizeMode="cover" />
      </View>
    );
  }

  const slideWidth = layoutWidth > 0 ? layoutWidth : 300;

  return (
    <View style={[styles.container, { height }, style]} onLayout={onLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        decelerationRate="fast"
      >
        {safePhotos.map((uri, i) => (
          <View key={`${uri}-${i}`} style={[styles.slide, { width: slideWidth, height }]}>
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {safePhotos.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === page && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  slide: {
    overflow: 'hidden',
  },
  dots: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: theme.colors.textInverse,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  placeholder: {
    width: '100%',
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 56,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  placeholderText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
