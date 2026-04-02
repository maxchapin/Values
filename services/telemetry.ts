/**
 * Production telemetry wiring. Replace the stub provider with Firebase/Mixpanel/etc. via initializeAnalytics.
 */

import { initializeAnalytics, type AnalyticsProvider } from './analytics';

/** No-op implementation for release builds until a real SDK is configured. */
class ProductionAnalyticsStub implements AnalyticsProvider {
  trackEvent(): void {}
  trackScreenView(): void {}
  setUserProperties(): void {}
  setUserId(): void {}
}

/** Call once at app startup (e.g. App.tsx). In __DEV__, keep default console analytics. */
export function initProductionTelemetry(): void {
  if (__DEV__) return;
  initializeAnalytics(new ProductionAnalyticsStub());
}
