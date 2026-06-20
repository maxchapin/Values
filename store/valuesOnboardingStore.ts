/**
 * Values Onboarding Store
 * Flat selection model: user picks 3–10 values, no tiers/ranking.
 */

import { create } from 'zustand';
import { ValuesOnboardingStep } from '../types/value';
import { UserValuesProfile } from '../types/user';
import { INITIAL_VALUES } from '../data/valuesConstants';

const MAX_SELECTION = 10;

interface ValuesOnboardingStore {
  selectedValueIds: string[];
  currentStep: ValuesOnboardingStep;

  // Selectors
  selectedCount: () => number;
  isSelected: (id: string) => boolean;
  isAtCap: () => boolean;

  // Actions
  toggleValue: (id: string) => void;
  proceedToNextStep: () => void;
  goToPreviousStep: () => void;
  resetValues: () => void;
  initializeFromProfile: (profile: UserValuesProfile | undefined) => void;
  getStepInfo: () => { stepNumber: number; totalSteps: number; title: string; subtitle: string };
}

export const useValuesOnboardingStore = create<ValuesOnboardingStore>((set, get) => ({
  selectedValueIds: [],
  currentStep: 'select',

  selectedCount: () => get().selectedValueIds.length,
  isSelected: (id) => get().selectedValueIds.includes(id),
  isAtCap: () => get().selectedValueIds.length >= MAX_SELECTION,

  toggleValue: (id) => {
    const { selectedValueIds } = get();
    if (selectedValueIds.includes(id)) {
      set({ selectedValueIds: selectedValueIds.filter((v) => v !== id) });
    } else if (selectedValueIds.length < MAX_SELECTION) {
      set({ selectedValueIds: [...selectedValueIds, id] });
    }
    // If at cap, do nothing (UI shows cap indicator)
  },

  proceedToNextStep: () => {
    const { currentStep } = get();
    if (currentStep === 'select') set({ currentStep: 'summary' });
  },

  goToPreviousStep: () => {
    const { currentStep } = get();
    if (currentStep === 'summary') set({ currentStep: 'select' });
  },

  resetValues: () => set({ selectedValueIds: [], currentStep: 'select' }),

  initializeFromProfile: (profile) => {
    if (!profile) {
      set({ selectedValueIds: [], currentStep: 'select' });
      return;
    }
    // Prefer flat selectedValueIds; fall back to legacy top5Ids
    const legacyProfile = profile as unknown as { top5Ids?: string[] };
    const ids =
      Array.isArray(profile.selectedValueIds) && profile.selectedValueIds.length > 0
        ? profile.selectedValueIds
        : Array.isArray(legacyProfile.top5Ids) && legacyProfile.top5Ids.length > 0
        ? legacyProfile.top5Ids
        : [];
    set({ selectedValueIds: ids.slice(0, MAX_SELECTION), currentStep: 'select' });
  },

  getStepInfo: () => {
    const { currentStep, selectedValueIds } = get();
    const count = selectedValueIds.length;
    if (currentStep === 'select') {
      return {
        stepNumber: 1,
        totalSteps: 2,
        title: 'Select your values',
        subtitle:
          count === 0
            ? 'Pick the values that matter to you'
            : `${count} selected — tap Continue when ready`,
      };
    }
    return {
      stepNumber: 2,
      totalSteps: 2,
      title: 'Your values',
      subtitle: `${count} value${count !== 1 ? 's' : ''} selected`,
    };
  },
}));

export { MAX_SELECTION };

// Helper: build a UserValuesProfile from the current store selection
export function buildValuesProfileFromIds(selectedValueIds: string[]): UserValuesProfile {
  const allValues = INITIAL_VALUES;
  const selectedValues = selectedValueIds
    .map((id) => {
      const found = allValues.find((v) => v.id === id);
      return found ? { id: found.id, label: found.label } : null;
    })
    .filter((v): v is { id: string; label: string } => v !== null);
  return { selectedValueIds, selectedValues };
}
