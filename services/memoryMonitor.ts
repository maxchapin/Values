/**
 * Memory monitor for DEV only.
 * Call from App.tsx when __DEV__ to log heap usage and track regressions.
 * Target: 200–250MB in Expo Go (down from ~355MB).
 */

const INTERVAL_MS = 15000;

/** Chrome / Hermes expose `memory` on `performance`; it is not in the standard `Performance` typedef. */
type PerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
};

export function monitorMemory(): () => void {
  if (!__DEV__) return () => {};

  const logMemory = (): void => {
    const perf = global.performance as PerformanceWithMemory;
    if (perf?.memory != null) {
      const mb = (perf.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      const limit = (perf.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(0);
      console.log(`[Memory] JS heap: ${mb} MB / ${limit} MB limit`);
    }
  };

  logMemory();
  const id = setInterval(logMemory, INTERVAL_MS);

  return () => clearInterval(id);
}
