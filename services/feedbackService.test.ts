/**
 * Unit tests for feedback submission.
 * Mocks API and AsyncStorage; run with: npm test -- services/feedbackService.test.ts
 */
(global as any).__DEV__ = false;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitFeedback, getPendingFeedback } from './feedbackService';

const mockSetItem = jest.fn<Promise<void>, [string, string]>(() => Promise.resolve());
const mockGetItem = jest.fn<Promise<string | null>, [string]>(() => Promise.resolve(null));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: (key: string, value: string) => mockSetItem(key, value),
  getItem: (key: string) => mockGetItem(key),
}));

jest.mock('./api', () => ({
  post: jest.fn(() => Promise.reject(new Error('No API'))),
}));

describe('feedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  describe('submitFeedback', () => {
    it('returns validation error when text is empty', async () => {
      const result = await submitFeedback('   ');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/enter some feedback/i);
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('returns success and stores locally when API fails', async () => {
      const result = await submitFeedback('Great app!', 'discover_empty');
      expect(result.success).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        '@values/pending_feedback',
        expect.stringContaining('Great app!')
      );
    });

    it('appends to existing pending feedback', async () => {
      (mockGetItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ text: 'First', timestamp: '2024-01-01', context: 'a' }])
      );
      await submitFeedback('Second');
      expect(mockSetItem).toHaveBeenCalledWith(
        '@values/pending_feedback',
        expect.stringMatching(/"Second"/)
      );
    });
  });

  describe('getPendingFeedback', () => {
    it('returns empty array when nothing stored', async () => {
      mockGetItem.mockResolvedValue(null);
      const pending = await getPendingFeedback();
      expect(pending).toEqual([]);
    });

    it('returns parsed array when valid JSON stored', async () => {
      (mockGetItem as jest.Mock).mockResolvedValue(
        JSON.stringify([{ text: 'a', timestamp: '2024-01-01' }])
      );
      const pending = await getPendingFeedback();
      expect(pending).toHaveLength(1);
      expect(pending[0].text).toBe('a');
    });
  });
});
