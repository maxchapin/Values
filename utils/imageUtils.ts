/**
 * Profile image resize/compress for lower memory and upload size.
 * Uses expo-image-manipulator when available; otherwise returns original URI.
 */

const PROFILE_MAX_WIDTH = 800;
const PROFILE_COMPRESS_QUALITY = 0.6;

export type ResizeProfileImageResult =
  | { ok: true; uri: string }
  | { ok: false; uri: string; error: string };

/**
 * Resize and compress a profile image for display/upload.
 * Target: quality 0.6, max width 800px. Reduces memory and bandwidth.
 * If expo-image-manipulator is not installed, returns original URI (ok: false).
 */
export async function resizeProfileImage(uri: string): Promise<ResizeProfileImageResult> {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: PROFILE_MAX_WIDTH } }],
      { compress: PROFILE_COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result?.uri ? { ok: true, uri: result.uri } : { ok: false, uri, error: 'No output URI' };
  } catch {
    return { ok: false, uri, error: 'Manipulator unavailable' };
  }
}
