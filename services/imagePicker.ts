/**
 * Image Picker Service
 * Wraps expo-image-picker for profile photos: media library permission + launch.
 * Returns selected image URI(s) in a typed way; handles cancel gracefully.
 */

import * as ImagePicker from 'expo-image-picker';

export type PickImageResult =
  | { picked: true; uri: string }
  | { picked: false; canceled: true }
  | { picked: false; canceled: false; error: string };

/**
 * Request media library permission. Call before opening the picker so the user
 * sees the prompt at a predictable time.
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return granted;
}

/**
 * Open the system image library, limited to images. Requests permission if needed.
 * Returns the selected image URI when the user picks one; returns a typed
 * "canceled" result when they dismiss without selecting. Never throws for cancel.
 */
export async function pickImageFromLibrary(): Promise<PickImageResult> {
  const granted = await requestMediaLibraryPermission();
  if (!granted) {
    return { picked: false, canceled: false, error: 'Permission to access photos was denied.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 1,
  });

  if (result.canceled) {
    return { picked: false, canceled: true };
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    return { picked: false, canceled: false, error: 'No image was returned.' };
  }

  return { picked: true, uri: asset.uri };
}
