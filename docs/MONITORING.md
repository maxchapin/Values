# Monitoring

## Recommended for launch

- **Supabase**: Dashboard → Logs and API error rates; enable alerts if available on your plan.
- **Client errors**: Integrate **Sentry** (`@sentry/react-native`) or similar; capture breadcrumbs for auth and `loadMatches` failures.
- **Analytics**: Replace `ProductionAnalyticsStub` in [`services/telemetry.ts`](../services/telemetry.ts) by calling `initializeAnalytics(...)` with your provider (Firebase Analytics, Mixpanel, Amplitude).

## Current behavior

- [`initProductionTelemetry`](../services/telemetry.ts) installs a **silent** analytics implementation in release builds so `trackScreenView` / `trackEvent` are safe no-ops until you wire a real provider.
