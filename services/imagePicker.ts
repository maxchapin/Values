/**
 * Image Picker Service
 *
 * Wraps expo-image-picker for profile photos: ensures media library permission,
 * quality 0.7 + 1:1 aspect for lower memory. Optional resizeProfileImage() for
 * further compression (quality 0.6, max width 800) when saving profile photos.
 */

import * as ImagePicker from 'expo-image-picker';
import { ensurePhotoLibraryPermission } from './photoLibraryPermission';
import { resizeProfileImage } from '../utils/imageUtils';

export type PickImageResult =
  | { picked: true; uri: string }
  | { picked: false; canceled: true }
  | { picked: false; canceled: false; error: string };

/**
 * Open the system image library for choosing a profile photo.
 * Always checks/requests permission first via ensurePhotoLibraryPermission();
 * only opens the picker when permission is granted. Handles canceled and
 * limited-access (Selected Photos) without errors.
 */
export async function pickImageFromLibrary(): Promise<PickImageResult> {
  const granted = await ensurePhotoLibraryPermission();
  if (!granted) {
    return { picked: false, canceled: false, error: 'Permission to access photos was denied.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled) {
    return { picked: false, canceled: true };
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    return { picked: false, canceled: false, error: 'No image was returned.' };
  }

  // Resize/compress for profile (quality 0.6, max 800px) to save memory and bandwidth
  const resized = await resizeProfileImage(asset.uri);
  const uri = resized.ok ? resized.uri : asset.uri;

  return { picked: true, uri };
}
