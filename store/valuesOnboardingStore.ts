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
  cycleValueTier: (id: string) => { success: boolean; blockedReason?: 'top20' | 'top10' | 'top5' }; // Returns success status and which cap blocked it
  resetValues: () => void;
  initializeFromProfile: (valuesProfile: { allValues: ValueItem[] }) => void;
  canProceedToNextStep: () => boolean;
  proceedToNextStep: () => void;
  goToPreviousStep: () => void;
  getStepInfo: () => {
    stepNumber: number;
    totalSteps: number;
    title: string;
    subtitle: string;
  };
  verifyTierHierarchy: () => boolean; // Dev helper to verify consistency
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

  /**
   * Cycle a value's tier hierarchically: none → initial → top20 → top10 → top5 → top10 → top20 → initial → none
   * Used in edit mode (from Edit Profile) to allow free promotion/demotion
   * Respects caps: top20 ≤ 20, top10 ≤ 10, top5 ≤ 5
   * Maintains hierarchy: top5 ⊆ top10 ⊆ top20 ⊆ initial
   * 
   * Returns { success: boolean, blockedReason?: 'top20' | 'top10' | 'top5' }
   */
  cycleValueTier: (id: string): { success: boolean; blockedReason?: 'top20' | 'top10' | 'top5' } => {
    const { values } = get();
    const value = values.find((v) => v.id === id);

    if (!value) {
      if (__DEV__) {
        console.warn(`[ValuesOnboardingStore] Value not found: ${id}`);
      }
      return { success: false };
    }

    // Hierarchical cycle: none → initial → top20 → top10 → top5 → top10 → top20 → initial → none
    // Strategy: Track direction by checking if we can promote from current tier
    // If at top5, always demote to top10
    // Otherwise, try to promote first; if cap prevents, demote
    
    let actualNextTier: ValueTier;
    let isPromoting = false;
    
    if (value.tier === 'top5') {
      // From top5, always go back to top10 (demote)
      actualNextTier = 'top10';
      isPromoting = false;
    } else if (value.tier === 'top10') {
      // From top10: try to promote to top5, otherwise demote to top20
      const top5Count = get().top5Count();
      if (top5Count < 5) {
        actualNextTier = 'top5';
        isPromoting = true;
      } else {
        actualNextTier = 'top20';
        isPromoting = false;
      }
    } else if (value.tier === 'top20') {
      // From top20: try to promote to top10, otherwise demote to initial
      const top10Count = get().top10Count();
      if (top10Count < 10) {
        actualNextTier = 'top10';
        isPromoting = true;
      } else {
        actualNextTier = 'initial';
        isPromoting = false;
      }
    } else if (value.tier === 'initial') {
      // From initial: try to promote to top20, otherwise demote to none
      const top20Count = get().top20Count();
      if (top20Count < 20) {
        actualNextTier = 'top20';
        isPromoting = true;
      } else {
        actualNextTier = 'none';
        isPromoting = false;
      }
    } else {
      // From none, always promote to initial
      actualNextTier = 'initial';
      isPromoting = true;
    }

    // Check caps before promoting (only for promotions, not demotions)
    if (isPromoting) {
      if (actualNextTier === 'top20') {
        const top20Count = get().top20Count();
        if (top20Count >= 20) {
          if (__DEV__) {
            console.log(`[ValuesOnboardingStore] Cannot cycle to top20: cap reached (20)`);
          }
          return { success: false, blockedReason: 'top20' };
        }
      } else if (actualNextTier === 'top10') {
        const top10Count = get().top10Count();
        if (top10Count >= 10) {
          if (__DEV__) {
            console.log(`[ValuesOnboardingStore] Cannot cycle to top10: cap reached (10)`);
          }
          return { success: false, blockedReason: 'top10' };
        }
      } else if (actualNextTier === 'top5') {
        const top5Count = get().top5Count();
        if (top5Count >= 5) {
          if (__DEV__) {
            console.log(`[ValuesOnboardingStore] Cannot cycle to top5: cap reached (5)`);
          }
          return { success: false, blockedReason: 'top5' };
        }
      }
    }

    // Apply the tier change
    const updatedValues = updateValueTier(values, id, actualNextTier);
    set({ values: updatedValues });

    if (__DEV__) {
      console.log(`[ValuesOnboardingStore] Cycled ${id}: ${value.tier} → ${actualNextTier}`);
    }

    return { success: true };
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
   * Initialize values store from existing user profile
   * Used when editing profile - pre-fills tiers from saved valuesProfile
   */
  initializeFromProfile: (valuesProfile: { allValues: ValueItem[] }): void => {
    if (__DEV__) {
      console.log('[ValuesOnboardingStore] Initializing from profile with', valuesProfile.allValues.length, 'values');
    }
    
    // Create a map of existing values by ID for quick lookup
    const existingValuesMap = new Map<string, ValueItem>();
    valuesProfile.allValues.forEach((v) => {
      existingValuesMap.set(v.id, v);
    });

    // Merge with INITIAL_VALUES, preserving tiers from profile where they exist
    const mergedValues: ValueItem[] = INITIAL_VALUES.map((initialValue) => {
      const existing = existingValuesMap.get(initialValue.id);
      if (existing) {
        // Use the tier from the saved profile
        return {
          ...initialValue,
          tier: existing.tier,
        };
      }
      // Value not in saved profile, keep as 'none'
      return initialValue;
    });

    // Start at summary step since user is editing existing values
    set({
      values: mergedValues,
      currentStep: 'summary',
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
          // Transition to top20 step: keep all values at 'initial' tier
          // User will explicitly promote values from initial to top20 by tapping
          // Do NOT automatically promote - top20 should start empty (top20Count = 0)
          set({ currentStep: 'top20' });
          if (__DEV__) {
            console.log('[ValuesOnboardingStore] Transitioned to top20 step - top20 starts empty, user will promote from initial');
          }
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

  /**
   * Dev helper: Verify that tier hierarchy is consistent
   * Checks: top5 ⊆ top10 ⊆ top20 ⊆ initial
   * Returns true if hierarchy is valid, false otherwise
   */
  verifyTierHierarchy: (): boolean => {
    const { values } = get();
    
    const top5Ids = new Set(values.filter((v) => v.tier === 'top5').map((v) => v.id));
    const top10Ids = new Set(values.filter((v) => v.tier === 'top10' || v.tier === 'top5').map((v) => v.id));
    const top20Ids = new Set(values.filter((v) => v.tier === 'top20' || v.tier === 'top10' || v.tier === 'top5').map((v) => v.id));
    const initialIds = new Set(values.filter((v) => v.tier !== 'none').map((v) => v.id));

    // Check: top5 ⊆ top10
    for (const id of top5Ids) {
      if (!top10Ids.has(id)) {
        if (__DEV__) {
          console.error(`[ValuesOnboardingStore] Hierarchy violation: ${id} is in top5 but not in top10`);
        }
        return false;
      }
    }

    // Check: top10 ⊆ top20
    for (const id of top10Ids) {
      if (!top20Ids.has(id)) {
        if (__DEV__) {
          console.error(`[ValuesOnboardingStore] Hierarchy violation: ${id} is in top10 but not in top20`);
        }
        return false;
      }
    }

    // Check: top20 ⊆ initial
    for (const id of top20Ids) {
      if (!initialIds.has(id)) {
        if (__DEV__) {
          console.error(`[ValuesOnboardingStore] Hierarchy violation: ${id} is in top20 but not in initial`);
        }
        return false;
      }
    }

    // Check counts match
    if (top5Ids.size !== get().top5Count()) {
      if (__DEV__) {
        console.error(`[ValuesOnboardingStore] Count mismatch: top5Ids.size (${top5Ids.size}) !== top5Count() (${get().top5Count()})`);
      }
      return false;
    }

    if (top10Ids.size !== get().top10Count()) {
      if (__DEV__) {
        console.error(`[ValuesOnboardingStore] Count mismatch: top10Ids.size (${top10Ids.size}) !== top10Count() (${get().top10Count()})`);
      }
      return false;
    }

    if (top20Ids.size !== get().top20Count()) {
      if (__DEV__) {
        console.error(`[ValuesOnboardingStore] Count mismatch: top20Ids.size (${top20Ids.size}) !== top20Count() (${get().top20Count()})`);
      }
      return false;
    }

    if (initialIds.size !== get().initialCount()) {
      if (__DEV__) {
        console.error(`[ValuesOnboardingStore] Count mismatch: initialIds.size (${initialIds.size}) !== initialCount() (${get().initialCount()})`);
      }
      return false;
    }

    if (__DEV__) {
      console.log('[ValuesOnboardingStore] ✅ Tier hierarchy verified: all constraints satisfied');
    }

    return true;
  },
}));
