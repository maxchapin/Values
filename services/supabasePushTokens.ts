import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// registerPushToken
// Requests notification permission (if needed) and upserts this device's
// Expo push token for the given user. No-op on simulators, denied
// permissions, or any error — registration failures should never disrupt
// the app.
// ---------------------------------------------------------------------------
export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: expoToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, expo_token: expoToken },
        { onConflict: 'user_id,expo_token' },
      );

    if (error && __DEV__) {
      console.warn('[supabasePushTokens] upsert error:', error.message);
    }
  } catch (e) {
    if (__DEV__) console.warn('[supabasePushTokens] registerPushToken threw:', e);
  }
}
