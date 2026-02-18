/**
 * Feedback submission: tries API first, falls back to local logging and optional persistence.
 * Wire a real feedback endpoint by setting EXPO_PUBLIC_API_URL and implementing POST /feedback on your backend.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { post } from './api';

const PENDING_FEEDBACK_KEY = '@values/pending_feedback';

export interface FeedbackPayload {
  text: string;
  context?: string;
  timestamp: string;
}

export interface SubmitFeedbackResult {
  success: boolean;
  error?: string;
}

/**
 * Submit user feedback. Tries POST /feedback; on failure or missing API, logs and stores locally.
 */
export async function submitFeedback(
  text: string,
  context?: string
): Promise<SubmitFeedbackResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { success: false, error: 'Please enter some feedback.' };
  }

  const payload: FeedbackPayload = {
    text: trimmed,
    context,
    timestamp: new Date().toISOString(),
  };

  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (apiUrl && apiUrl !== 'https://api.example.com') {
      await post<{ ok: boolean }>('/feedback', payload);
      return { success: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Feedback] API not available or failed, saving locally:', message);
    }
  }

  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Feedback]', payload);
    }
    const pending = await getPendingFeedback();
    pending.push(payload);
    await AsyncStorage.setItem(PENDING_FEEDBACK_KEY, JSON.stringify(pending));
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[Feedback] Failed to store locally:', e);
    }
  }

  return { success: true };
}

/** For dev/debug: retrieve locally stored feedback. */
export async function getPendingFeedback(): Promise<FeedbackPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeedbackPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
