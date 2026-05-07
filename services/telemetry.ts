import { Mixpanel } from 'mixpanel-react-native';
import { initializeAnalytics, type AnalyticsProvider, type BaseEventProperties } from './analytics';

class MixpanelAnalyticsProvider implements AnalyticsProvider {
  private mp: Mixpanel;

  constructor(token: string) {
    this.mp = new Mixpanel(token, false);
    this.mp.init();
    this.mp.registerSuperProperties({ environment: __DEV__ ? 'development' : 'production' });
  }

  trackEvent(eventName: string, properties?: BaseEventProperties): void {
    this.mp.track(eventName, properties ?? {});
  }

  trackScreenView(screenName: string, properties?: BaseEventProperties): void {
    this.mp.track('Screen View', { screen: screenName, ...(properties ?? {}) });
  }

  setUserProperties(properties: BaseEventProperties): void {
    this.mp.getPeople().set(properties);
  }

  setUserId(userId: string): void {
    this.mp.identify(userId);
  }
}

/** Call once at app startup (App.tsx). Initializes Mixpanel in all environments so Live View works during dev. */
export function initProductionTelemetry(): void {
  const token = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
  if (!token) return;
  initializeAnalytics(new MixpanelAnalyticsProvider(token));
}
