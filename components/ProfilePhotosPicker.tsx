import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { theme } from '../theme';
import { pickImageFromLibrary } from '../services/imagePicker';
import { MAX_PROFILE_PHOTOS } from '../constants/profile';

interface ProfilePhotosPickerProps {
  photos: string[];
  onChange: (next: string[]) => void;
  maxPhotos?: number;
}

export const ProfilePhotosPicker: React.FC<ProfilePhotosPickerProps> = ({
  photos,
  onChange,
  maxPhotos = MAX_PROFILE_PHOTOS,
}) => {
  const [isPicking, setIsPicking] = useState(false);

  const safePhotos = Array.isArray(photos) ? photos.slice(0, maxPhotos) : [];

  const openPicker = useCallback(
    async (replaceIndex: number | null) => {
      if (isPicking) return;
      if (replaceIndex === null && safePhotos.length >= maxPhotos) return;

      setIsPicking(true);
      try {
        const result = await pickImageFromLibrary();

        if (result.picked && result.uri) {
          if (replaceIndex !== null) {
            const next = [...safePhotos];
            next[replaceIndex] = result.uri;
            onChange(next.slice(0, maxPhotos));
          } else {
            onChange([...safePhotos, result.uri].slice(0, maxPhotos));
          }
        } else if (!result.canceled && result.error) {
          Alert.alert('Photo', result.error);
        }
        // canceled: no-op
      } finally {
        setIsPicking(false);
      }
    },
    [isPicking, safePhotos, maxPhotos, onChange]
  );

  const addPhoto = useCallback(() => {
    if (safePhotos.length >= maxPhotos) return;
    openPicker(null);
  }, [safePhotos.length, maxPhotos, openPicker]);

  const removePhoto = useCallback(
    (index: number) => {
      onChange(safePhotos.filter((_, i) => i !== index));
    },
    [safePhotos, onChange]
  );

  const replacePhoto = useCallback(
    (index: number) => {
      openPicker(index);
    },
    [openPicker]
  );

  const slots = Array.from({ length: maxPhotos }, (_, i) => safePhotos[i] ?? null);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Photos</Text>
        <Text style={styles.hint}>Add up to {maxPhotos} photos</Text>
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
                <TouchableOpacity
                  style={styles.replace}
                  onPress={() => replacePhoto(index)}
                  accessibilityLabel="Replace photo"
                >
                  <Text style={styles.replaceText}>Replace</Text>
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
              disabled={!canAddHere || isPicking}
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
  replace: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  replaceText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textInverse,
    fontWeight: theme.typography.fontWeight.semibold,
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
