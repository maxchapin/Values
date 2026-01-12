import { useState, useRef } from 'react';

/**
 * Hook to detect multiple taps for accessing debug screen
 * 
 * @param requiredTaps - Number of taps required (default: 5)
 * @param timeout - Time window in ms for taps (default: 2000)
 * @returns Object with onPress handler and isDebugMode flag
 * 
 * @example
 * const { handlePress, isDebugMode } = useDebugAccess();
 * <TouchableOpacity onPress={handlePress}>
 *   <Text>App Title</Text>
 * </TouchableOpacity>
 */
export function useDebugAccess(
  requiredTaps: number = 5,
  timeout: number = 2000
): {
  handlePress: () => void;
  isDebugMode: boolean;
  reset: () => void;
} {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const tapCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = (): void => {
    tapCountRef.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handlePress = (): void => {
    // Only work in development mode
    if (!__DEV__) {
      return;
    }

    tapCountRef.current += 1;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If we've reached the required taps, enable debug mode
    if (tapCountRef.current >= requiredTaps) {
      setIsDebugMode(true);
      reset();
      return;
    }

    // Set timeout to reset tap count
    timeoutRef.current = setTimeout(() => {
      reset();
    }, timeout);
  };

  return {
    handlePress,
    isDebugMode,
    reset: () => {
      setIsDebugMode(false);
      reset();
    },
  };
}
