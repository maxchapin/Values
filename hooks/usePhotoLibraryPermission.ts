/**
 * usePhotoLibraryPermission
 *
 * Optional hook for components that want to check or request photo library
 * permission (e.g. to show different UI or pre-request before user taps Add).
 * The actual picker flow always uses ensurePhotoLibraryPermission() inside
 * pickImageFromLibrary() so permission is handled before the picker opens.
 */

import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ensurePhotoLibraryPermission } from '../services/photoLibraryPermission';

export type MediaLibraryPermissionStatus = 'undetermined' | 'granted' | 'denied' | 'limited';

/**
 * Returns current permission status and a function to ensure permission
 * (check + in-app explanation + request). Use ensurePermission before
 * opening the picker if you need to gate UI; otherwise pickImageFromLibrary()
 * already does this internally.
 */
export function usePhotoLibraryPermission() {
  const [status, setStatus] = useState<MediaLibraryPermissionStatus>('undetermined');

  const checkStatus = useCallback(async () => {
    const { status: s } = await ImagePicker.getMediaLibraryPermissionsAsync();
    setStatus(s);
    return s;
  }, []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const granted = await ensurePhotoLibraryPermission();
    if (granted) {
      setStatus('granted');
    }
    return granted;
  }, []);

  return { status, checkStatus, ensurePermission };
}
