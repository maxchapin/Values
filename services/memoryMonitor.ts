/**
 * Memory monitor for DEV only.
 * Call from App.tsx when __DEV__ to log heap usage and track regressions.
 * Target: 200–250MB in Expo Go (down from ~355MB).
 */

const INTERVAL_MS = 15000;

export function monitorMemory(): () => void {
  if (!__DEV__) return () => {};

  const logMemory = (): void => {
    if (global.performance?.memory != null) {
      const mb = (global.performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      const limit = (global.performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(0);
      console.log(`[Memory] JS heap: ${mb} MB / ${limit} MB limit`);
    }
  };

  logMemory();
  const id = setInterval(logMemory, INTERVAL_MS);

  return () => clearInterval(id);
}
