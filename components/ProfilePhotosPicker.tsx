import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { theme } from '../theme';

interface ProfilePhotosPickerProps {
  photos: string[];
  onChange: (next: string[]) => void;
  maxPhotos?: number;
}

function makeDevPhotoUri(seed: string): string {
  // Works without adding assets; good enough for dev.
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/900/1200`;
}

export const ProfilePhotosPicker: React.FC<ProfilePhotosPickerProps> = ({
  photos,
  onChange,
  maxPhotos = 3,
}) => {
  const safePhotos = Array.isArray(photos) ? photos.slice(0, maxPhotos) : [];

  const addPhoto = (): void => {
    if (safePhotos.length >= maxPhotos) return;
    const seed = `values-photo-${Date.now()}-${safePhotos.length + 1}`;
    onChange([...safePhotos, makeDevPhotoUri(seed)]);
  };

  const removePhoto = (index: number): void => {
    onChange(safePhotos.filter((_, i) => i !== index));
  };

  const slots = Array.from({ length: maxPhotos }, (_, i) => safePhotos[i] ?? null);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Photos</Text>
        <Text style={styles.hint}>Add 1–3 photos</Text>
      </View>

      <View style={styles.row}>
        {slots.map((uri, index) => {
          if (uri) {
            return (
              <View key={`${uri}-${index}`} style={styles.photoWrap}>
                <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.remove}
                  onPress={() => removePhoto(index)}
                  accessibilityLabel="Remove photo"
                >
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          }

          const canAddHere = index === safePhotos.length;
          return (
            <TouchableOpacity
              key={`empty-${index}`}
              style={[styles.addSlot, !canAddHere && styles.addSlotDisabled]}
              onPress={canAddHere ? addPhoto : undefined}
              activeOpacity={0.8}
              disabled={!canAddHere}
              accessibilityLabel="Add photo"
            >
              <Text style={styles.addPlus}>+</Text>
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  photoWrap: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  remove: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: theme.colors.textInverse,
    fontWeight: theme.typography.fontWeight.bold,
  },
  addSlot: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlotDisabled: {
    opacity: 0.35,
  },
  addPlus: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  addText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});

