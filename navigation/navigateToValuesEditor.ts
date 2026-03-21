/**
 * Open the unified values onboarding/editor from anywhere (Discover header, Profile card, etc.).
 * Matches ProfileScreen: prefills from `user.valuesProfile` when present, same route + params.
 */

import { useValuesOnboardingStore } from '../store/valuesOnboardingStore';
import type { User } from '../types/user';
import { ROUTES, type RootStackParamList } from './types';

export type NavigateToValuesEditorNav = {
  navigate<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params?: RootStackParamList[RouteName]
  ): void;
};

export function navigateToValuesEditorFromProfile(nav: NavigateToValuesEditorNav, currentUser: User | null): void {
  if (currentUser?.valuesProfile) {
    useValuesOnboardingStore.getState().initializeFromProfile(currentUser.valuesProfile);
  }
  nav.navigate(ROUTES.VALUES_ONBOARDING, { fromProfileCard: true });
}
