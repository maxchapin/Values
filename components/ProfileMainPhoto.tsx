import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface ProfileMainPhotoProps {
  uri?: string | null;
  name?: string;
  height?: number;
  style?: ViewStyle;
}

export const ProfileMainPhoto: React.FC<ProfileMainPhotoProps> = ({
  uri,
  name,
  height = 320,
  style,
}) => {
  const initial = (name?.trim()?.[0] || '?').toUpperCase();

  if (!uri) {
    return (
      <View style={[styles.placeholder, { height }, style]}>
        <Text style={styles.initial}>{initial}</Text>
        <Text style={styles.placeholderText}>No photo</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, style]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
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

