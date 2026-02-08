/**
 * Analytics Service
 * 
 * Centralized event tracking service that currently logs to console.
 * Designed to be easily swapped out for a real analytics provider
 * (e.g., Firebase Analytics, Mixpanel, Amplitude) without changing
 * the calling code.
 * 
 * All events are typed to ensure consistency and prevent typos.
 */

/**
 * Screen names for tracking screen views
 */
export type ScreenName =
  | 'Welcome'
  | 'SignUp'
  | 'ProfileSetup'
  | 'ValuesSelection'
  | 'ValuesNarrow20'
  | 'ValuesNarrow10'
  | 'ValuesFinal5'
  | 'Discover'
  | 'Matches'
  | 'Profile'
  | 'ProfilePreview'
  | 'EditProfile'
  | 'Home'
  | 'Details';

/**
 * Values selection step names
 */
export type ValuesSelectionStep =
  | 'initial'
  | 'narrow_20'
  | 'narrow_10'
  | 'final_5';

/**
 * Base event properties that can be attached to any event
 */
export interface BaseEventProperties {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Analytics provider interface
 * Implement this interface to swap out the analytics implementation
 */
export interface AnalyticsProvider {
  trackEvent(eventName: string, properties?: BaseEventProperties): void;
  trackScreenView(screenName: string, properties?: BaseEventProperties): void;
  setUserProperties(properties: BaseEventProperties): void;
  setUserId(userId: string): void;
}

/**
 * Console-based analytics provider (default implementation)
 * Logs all events to console for development/debugging
 */
class ConsoleAnalyticsProvider implements AnalyticsProvider {
  trackEvent(eventName: string, properties?: BaseEventProperties): void {
    if (__DEV__) {
      console.log(`[Analytics] Event: ${eventName}`, properties || {});
    }
  }

  trackScreenView(screenName: string, properties?: BaseEventProperties): void {
    if (__DEV__) {
      console.log(`[Analytics] Screen View: ${screenName}`, properties || {});
    }
  }

  setUserProperties(properties: BaseEventProperties): void {
    if (__DEV__) {
      console.log('[Analytics] User Properties:', properties);
    }
  }

  setUserId(userId: string): void {
    if (__DEV__) {
      console.log(`[Analytics] User ID: ${userId}`);
    }
  }
}

/**
 * Current analytics provider instance
 * Replace this with a real provider implementation when ready
 */
let analyticsProvider: AnalyticsProvider = new ConsoleAnalyticsProvider();

/**
 * Initialize analytics with a custom provider
 * Call this during app initialization to use a real analytics service
 * 
 * @example
 * import { FirebaseAnalytics } from './providers/FirebaseAnalytics';
 * initializeAnalytics(new FirebaseAnalytics());
 */
export function initializeAnalytics(provider: AnalyticsProvider): void {
  analyticsProvider = provider;
}

/**
 * Track a screen view
 * 
 * @param screenName - Name of the screen being viewed
 * @param properties - Optional additional properties
 * 
 * @example
 * trackScreenView('Discover');
 * trackScreenView('Profile', { userId: '123' });
 */
export function trackScreenView(
  screenName: ScreenName,
  properties?: BaseEventProperties
): void {
  analyticsProvider.trackScreenView(screenName, properties);
}

/**
 * Track value selection during onboarding
 * 
 * @param step - Current step in the values selection flow
 * @param count - Number of values selected at this step
 * @param properties - Optional additional properties
 * 
 * @example
 * trackValueSelection('initial', 15);
 * trackValueSelection('final_5', 5);
 */
export function trackValueSelection(
  step: ValuesSelectionStep,
  count: number,
  properties?: BaseEventProperties
): void {
  analyticsProvider.trackEvent('value_selection', {
    step,
    count,
    ...properties,
  });
}

/**
 * Track when a user completes their profile setup
 * 
 * @param properties - Optional additional properties (e.g., completionTime, fieldsCompleted)
 * 
 * @example
 * trackProfileCompleted({ completionTime: 120 });
 */
export function trackProfileCompleted(
  properties?: BaseEventProperties
): void {
  analyticsProvider.trackEvent('profile_completed', properties);
}

/**
 * Track when a user likes a match
 * 
 * @param matchId - ID of the matched user
 * @param properties - Optional additional properties (e.g., similarityScore, sharedValuesCount)
 * 
 * @example
 * trackMatchLiked('user123', { similarityScore: 85, sharedValuesCount: 3 });
 */
export function trackMatchLiked(
  matchId: string,
  properties?: BaseEventProperties
): void {
  analyticsProvider.trackEvent('match_liked', {
    matchId,
    ...properties,
  });
}

/**
 * Track when a user passes on a match
 * 
 * @param matchId - ID of the matched user
 * @param properties - Optional additional properties
 * 
 * @example
 * trackMatchPassed('user123');
 */
export function trackMatchPassed(
  matchId: string,
  properties?: BaseEventProperties
): void {
  analyticsProvider.trackEvent('match_passed', {
    matchId,
    ...properties,
  });
}

/**
 * Track when a user signs up
 * 
 * @param properties - Optional additional properties
 * 
 * @example
 * trackSignUp({ method: 'email' });
 */
export function trackSignUp(properties?: BaseEventProperties): void {
  analyticsProvider.trackEvent('sign_up', properties);
}

/**
 * Track when a user starts the onboarding flow
 * 
 * @param properties - Optional additional properties
 */
export function trackOnboardingStarted(properties?: BaseEventProperties): void {
  analyticsProvider.trackEvent('onboarding_started', properties);
}

/**
 * Track when a user completes onboarding (values selection complete)
 * 
 * @param properties - Optional additional properties
 */
export function trackOnboardingCompleted(properties?: BaseEventProperties): void {
  analyticsProvider.trackEvent('onboarding_completed', properties);
}

/**
 * Set user properties for analytics
 * 
 * @param properties - User properties to set
 * 
 * @example
 * setUserProperties({ age: 25, location: 'New York' });
 */
export function setUserProperties(properties: BaseEventProperties): void {
  analyticsProvider.setUserProperties(properties);
}

/**
 * Set the current user ID for analytics
 * 
 * @param userId - User ID to track
 * 
 * @example
 * setUserId('user123');
 */
export function setUserId(userId: string): void {
  analyticsProvider.setUserId(userId);
}

/**
 * Track a custom event
 * Use this for events that don't have a dedicated function
 * 
 * @param eventName - Name of the event
 * @param properties - Event properties
 * 
 * @example
 * trackEvent('filter_applied', { filterType: 'age', minAge: 25, maxAge: 35 });
 */
export function trackEvent(
  eventName: string,
  properties?: BaseEventProperties
): void {
  analyticsProvider.trackEvent(eventName, properties);
}
