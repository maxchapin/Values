/**
 * Values Onboarding Store
 * Manages the tiered "values cloud" onboarding flow
 * Uses a single values array with tier assignments instead of separate arrays
 */

import { create } from 'zustand';
import { ValueItem, ValueTier, ValuesOnboardingStep } from '../types/value';
import { INITIAL_VALUES } from '../data/valuesConstants';

interface ValuesOnboardingStore {
  // State
  values: ValueItem[]; // Always the full list
  currentStep: ValuesOnboardingStep;

  // Derived helpers (selectors)
  initialCount: () => number;
  top20Count: () => number;
  top10Count: () => number;
  top5Count: () => number;

  // Actions
  setCurrentStep: (step: ValuesOnboardingStep) => void;
  toggleValueForCurrentStep: (id: string) => void;
  resetValues: () => void;
  canProceedToNextStep: () => boolean;
  proceedToNextStep: () => void;
  goToPreviousStep: () => void;
  getStepInfo: () => {
    stepNumber: number;
    totalSteps: number;
    title: string;
    subtitle: string;
  };
}

/**
 * Update a value's tier in the values array
 * The tier hierarchy (top5 ⊆ top10 ⊆ top20 ⊆ initial) is maintained
 * by the count functions which count values at least at a given tier
 */
function updateValueTier(
  values: ValueItem[],
  id: string,
  newTier: ValueTier
): ValueItem[] {
  return values.map((value) => {
    if (value.id !== id) {
      return value;
    }
    return {
      ...value,
      tier: newTier,
    };
  });
}

export const useValuesOnboardingStore = create<ValuesOnboardingStore>((set, get) => ({
  // Initial state
  values: [...INITIAL_VALUES], // Copy to avoid mutations
  currentStep: 'broad',

  // Derived helpers
  initialCount: () => {
    return get().values.filter((v) => v.tier === 'initial' || v.tier === 'top20' || v.tier === 'top10' || v.tier === 'top5').length;
  },

  top20Count: () => {
    return get().values.filter((v) => v.tier === 'top20' || v.tier === 'top10' || v.tier === 'top5').length;
  },

  top10Count: () => {
    return get().values.filter((v) => v.tier === 'top10' || v.tier === 'top5').length;
  },

  top5Count: () => {
    return get().values.filter((v) => v.tier === 'top5').length;
  },

  // Actions
  setCurrentStep: (step: ValuesOnboardingStep): void => {
    if (__DEV__) {
      console.log(`[ValuesOnboardingStore] Setting step: ${get().currentStep} → ${step}`);
    }
    set({ currentStep: step });
  },

  /**
   * Core toggle function with step-specific business rules
   * Enforces hierarchy: top5 ⊆ top10 ⊆ top20 ⊆ initial
   * 
   * Broad step (currentStep = 'broad'):
   *   - Toggling moves between 'none' and 'initial'
   *   - No cap on initial selections
   * 
   * Top20 step:
   *   - Toggling promotes/demotes between 'initial' and 'top20'
   *   - Hard cap of 20 values in top20 (top20 + top10 + top5)
   *   - Can only toggle values that are in 'initial' tier (or higher)
   *   - When demoting from top10/top5, demote to 'initial' (not top20) to maintain hierarchy
   * 
   * Top10 step:
   *   - Toggling manages 'top10' within the top20 set
   *   - Hard cap of 10 values in top10 (top10 + top5)
   *   - Can only toggle values that are in 'top20' tier (or top10/top5)
   *   - When demoting from top5, demote to 'top10' (not top20)
   * 
   * Top5 step:
   *   - Toggling manages 'top5' within the top10 set
   *   - Hard cap of 5 values in top5
   *   - Can only toggle values that are in 'top10' tier
   */
  toggleValueForCurrentStep: (id: string): void => {
    const { values, currentStep } = get();
    const value = values.find((v) => v.id === id);

    if (!value) {
      if (__DEV__) {
        console.warn(`[ValuesOnboardingStore] Value not found: ${id}`);
      }
      return;
    }

    let newTier: ValueTier = value.tier;

    switch (currentStep) {
      case 'broad': {
        // Toggle between 'none' and 'initial'
        if (value.tier === 'none') {
          newTier = 'initial';
        } else {
          // If already in any tier (initial, top20, top10, top5), demote to 'none'
          // This clears all tiers
          newTier = 'none';
        }
        break;
      }

      case 'top20': {
        // Toggle between 'initial' and 'top20'
        // Can toggle values in 'initial', 'top20', 'top10', or 'top5'
        const top20Count = get().top20Count();
        
        if (value.tier === 'initial') {
          // Promote to top20 if under cap
          if (top20Count < 20) {
            newTier = 'top20';
          } else {
            if (__DEV__) {
              console.log(`[ValuesOnboardingStore] Cannot promote to top20: already at cap (20)`);
            }
            return; // Can't add more, already at cap
          }
        } else if (value.tier === 'top20') {
          // Demote to 'initial'
          newTier = 'initial';
        } else if (value.tier === 'top10' || value.tier === 'top5') {
          // Demote from top10/top5 to 'initial' (not top20) to maintain hierarchy
          // This ensures top10/top5 values are always in top20 set
          // But in top20 step, we're managing the initial ↔ top20 boundary
          // So demote to initial, which will cascade down
          newTier = 'initial';
        } else if (value.tier === 'none') {
          // Can't toggle from 'none' in top20 step - must be in 'initial' first
          if (__DEV__) {
            console.log(`[ValuesOnboardingStore] Cannot toggle from 'none' in top20 step - value must be in 'initial' tier`);
          }
          return;
        }
        break;
      }

      case 'top10': {
        // Toggle between 'top20' and 'top10' within the top20 set
        // Can only toggle values that are in 'top20', 'top10', or 'top5' tier
        const top10Count = get().top10Count();
        
        if (value.tier === 'top20') {
          // Promote to top10 if under cap
          if (top10Count < 10) {
            newTier = 'top10';
          } else {
            if (__DEV__) {
              console.log(`[ValuesOnboardingStore] Cannot promote to top10: already at cap (10)`);
            }
            return; // Can't add more, already at cap
          }
        } else if (value.tier === 'top10') {
          // Demote to 'top20'
          newTier = 'top20';
        } else if (value.tier === 'top5') {
          // Demote from top5 to 'top10' (maintains hierarchy: top5 ⊆ top10)
          newTier = 'top10';
        } else {
          // Can't toggle values not in top20 set (initial or none)
          if (__DEV__) {
            console.log(`[ValuesOnboardingStore] Cannot toggle value not in top20 set: ${value.tier}`);
          }
          return;
        }
        break;
      }

      case 'top5': {
        // Toggle between 'top10' and 'top5' within the top10 set
        // Can only toggle values that are in 'top10' tier
        const top5Count = get().top5Count();
        
        if (value.tier === 'top10') {
          // Promote to top5 if under cap
          if (top5Count < 5) {
            newTier = 'top5';
          } else {
            if (__DEV__) {
              console.log(`[ValuesOnboardingStore] Cannot promote to top5: already at cap (5)`);
            }
            return; // Can't add more, already at cap
          }
        } else if (value.tier === 'top5') {
          // Demote to 'top10'
          newTier = 'top10';
        } else {
          // Can't toggle values not in top10 set
          if (__DEV__) {
            console.log(`[ValuesOnboardingStore] Cannot toggle value not in top10 set: ${value.tier}`);
          }
          return;
        }
        break;
      }

      case 'summary': {
        // Summary step - no toggling allowed
        if (__DEV__) {
          console.log(`[ValuesOnboardingStore] Cannot toggle values in summary step`);
        }
        return;
      }
    }

    // Apply the tier change
    const updatedValues = updateValueTier(values, id, newTier);
    set({ values: updatedValues });

    if (__DEV__) {
      console.log(`[ValuesOnboardingStore] Toggled ${id}: ${value.tier} → ${newTier} (step: ${currentStep})`);
    }
  },

  resetValues: (): void => {
    if (__DEV__) {
      console.log('[ValuesOnboardingStore] Resetting all values to tier: none');
    }
    set({
      values: [...INITIAL_VALUES], // Reset to initial state
      currentStep: 'broad',
    });
  },

  /**
   * Check if user can proceed to next step based on current step requirements
   */
  canProceedToNextStep: (): boolean => {
    const { currentStep } = get();
    const initial = get().initialCount();
    const top20 = get().top20Count();
    const top10 = get().top10Count();
    const top5 = get().top5Count();

    switch (currentStep) {
      case 'broad':
        // Require at least 5 initial selections
        return initial >= 5;
      case 'top20':
        // Require exactly 20 in top20 set
        return top20 === 20;
      case 'top10':
        // Require exactly 10 in top10 set
        return top10 === 10;
      case 'top5':
        // Require exactly 5 in top5
        return top5 === 5;
      case 'summary':
        return false; // No next step from summary
      default:
        return false;
    }
  },

  /**
   * Proceed to next step with skip logic
   * If initialCount <= 20, skip top20 step and go straight to top10
   */
  proceedToNextStep: (): void => {
    if (!get().canProceedToNextStep()) {
      return;
    }

    const { currentStep } = get();
    const initial = get().initialCount();
    let nextStep: ValuesOnboardingStep;

    switch (currentStep) {
      case 'broad':
        // If initialCount <= 20, skip top20 and go to top10
        // Otherwise, go to top20
        if (initial <= 20) {
          // Skip top20: promote all initial values to top20 (maintains hierarchy)
          // They'll all be available for top10 selection
          const { values } = get();
          const updatedValues = values.map((v) => {
            if (v.tier === 'initial') {
              return { ...v, tier: 'top20' as ValueTier };
            }
            return v;
          });
          set({ values: updatedValues, currentStep: 'top10' });
          if (__DEV__) {
            console.log('[ValuesOnboardingStore] Skipped top20 step (initialCount <= 20), went straight to top10');
          }
          return;
        } else {
          // Promote all initial to top20 for the top20 step
          const { values } = get();
          const updatedValues = values.map((v) => {
            if (v.tier === 'initial') {
              return { ...v, tier: 'top20' as ValueTier };
            }
            return v;
          });
          set({ values: updatedValues, currentStep: 'top20' });
          return;
        }
      case 'top20':
        nextStep = 'top10';
        break;
      case 'top10':
        nextStep = 'top5';
        break;
      case 'top5':
        nextStep = 'summary';
        break;
      default:
        return;
    }

    set({ currentStep: nextStep });
  },

  /**
   * Go back to previous step
   */
  goToPreviousStep: (): void => {
    const { currentStep } = get();
    let previousStep: ValuesOnboardingStep;

    switch (currentStep) {
      case 'top20':
        previousStep = 'broad';
        break;
      case 'top10':
        // If we skipped top20, go back to broad
        // Otherwise go back to top20
        const initial = get().initialCount();
        previousStep = initial <= 20 ? 'broad' : 'top20';
        break;
      case 'top5':
        previousStep = 'top10';
        break;
      case 'summary':
        previousStep = 'top5';
        break;
      default:
        return;
    }

    set({ currentStep: previousStep });
  },

  /**
   * Get step information (title, subtitle, step number)
   */
  getStepInfo: () => {
    const { currentStep } = get();
    const initial = get().initialCount();

    const stepMap: Record<ValuesOnboardingStep, { stepNumber: number; totalSteps: number; title: string; subtitle: string }> = {
      broad: {
        stepNumber: 1,
        totalSteps: initial <= 20 ? 3 : 4, // Adjust if top20 is skipped
        title: 'Pick what matters to you.',
        subtitle: "Tap every value you'd want in a relationship.",
      },
      top20: {
        stepNumber: 2,
        totalSteps: 4,
        title: 'Narrow to your top 20.',
        subtitle: 'From the ones you chose, pick the 20 that matter most.',
      },
      top10: {
        stepNumber: initial <= 20 ? 2 : 3,
        totalSteps: initial <= 20 ? 3 : 4,
        title: 'Now pick your top 10.',
        subtitle: 'These are your very important values.',
      },
      top5: {
        stepNumber: initial <= 20 ? 3 : 4,
        totalSteps: initial <= 20 ? 3 : 4,
        title: 'Choose your core 5.',
        subtitle: 'These are your non‑negotiables.',
      },
      summary: {
        stepNumber: initial <= 20 ? 4 : 5,
        totalSteps: initial <= 20 ? 4 : 5,
        title: 'Your values fingerprint.',
        subtitle: 'Review your values. You can edit them anytime.',
      },
    };

    return stepMap[currentStep];
  },
}));
