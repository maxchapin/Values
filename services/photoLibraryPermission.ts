/**
 * Photo Library Permission
 *
 * Centralized media library permission for profile photo selection. Follows
 * Apple UX/privacy expectations and Expo best practices: check status first,
 * show an in-app explanation before triggering the system dialog, and only
 * open the picker when permission is granted. This prevents the janky flow
 * where iOS shows "this app wants access to your photos" after the user
 * has already picked a photo.
 *
 * Use ensurePhotoLibraryPermission() before every call to
 * ImagePicker.launchImageLibraryAsync().
 */

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Ensures the app has media library permission before opening the photo picker.
 * Call this before launchImageLibraryAsync() so the system dialog (if needed)
 * appears at a predictable time, not after the user has already selected a photo.
 *
 * Flow:
 * 1. Check current status (getMediaLibraryPermissionsAsync).
 * 2. If already granted, return true.
 * 3. If not granted: show in-app explanation, then request (requestMediaLibraryPermissionsAsync).
 * 4. If user denies or has previously denied: show Settings hint, do NOT open picker, return false.
 *
 * iOS "Selected Photos" (limited access): We accept it; the picker will show
 * whatever photos the user has allowed. No special handling required.
 *
 * If the user revokes permission in Settings, the next tap to add/change photo
 * will run this flow again (explanation → request → alert if denied).
 */
export async function ensurePhotoLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();

  if (status === 'granted') {
    return true;
  }

  // Show friendly in-app explanation before triggering the iOS system dialog.
  // This matches Apple's guidance: explain why we need access before the system prompt.
  const userWantsToProceed = await new Promise<boolean>((resolve) => {
    Alert.alert(
      'Access your photos',
      'We use your photos only so you can choose profile pictures to show to potential matches. Tap OK to allow.',
      [
        { text: 'Not now', onPress: () => resolve(false), style: 'cancel' },
        { text: 'OK', onPress: () => resolve(true) },
      ]
    );
  });

  if (!userWantsToProceed) {
    return false;
  }

  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!granted) {
    Alert.alert(
      'Permission needed',
      'We use your photos only so you can choose pictures for your profile. You can change this later in Settings > Privacy > Photos.'
    );
    return false;
  }

  return true;
}
