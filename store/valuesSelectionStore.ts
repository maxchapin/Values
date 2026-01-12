/**
 * Values Selection Store
 * Manages the multi-step values selection flow with strict validation
 * Tracks selections at each step separately: selectedAny, top20, top10, top5
 */

import { create } from 'zustand';
import { Value, ValuesSelectionStep } from '../types/value';

interface ValuesSelectionStore {
  // State
  availableValues: Value[];
  selectedAny: string[]; // Initial selection - any number
  top20: string[]; // Narrowed to exactly 20
  top10: string[]; // Narrowed to exactly 10
  top5: string[]; // Final selection - exactly 5
  currentStep: ValuesSelectionStep;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadValues: () => Promise<void>;
  setCurrentStep: (step: ValuesSelectionStep) => void;
  addValue: (valueId: string) => void;
  removeValue: (valueId: string) => void;
  canProceedToNextStep: () => boolean;
  proceedToNextStep: () => void;
  goToPreviousStep: () => void;
  reset: () => void;
  getCurrentSelections: () => string[];
  getRequiredCountForStep: (step: ValuesSelectionStep) => number | null;
  
  // Dev helpers
  validateState: () => { isValid: boolean; errors: string[] };
}

/**
 * Get the required number of selections for a given step
 */
function getRequiredCount(step: ValuesSelectionStep): number | null {
  switch (step) {
    case ValuesSelectionStep.INITIAL:
      return null; // Any number
    case ValuesSelectionStep.NARROW_20:
      return 20;
    case ValuesSelectionStep.NARROW_10:
      return 10;
    case ValuesSelectionStep.FINAL_5:
      return 5;
    default:
      return null;
  }
}

export const useValuesSelectionStore = create<ValuesSelectionStore>((set, get) => ({
  // Initial state
  availableValues: [],
  selectedAny: [],
  top20: [],
  top10: [],
  top5: [],
  currentStep: ValuesSelectionStep.INITIAL,
  isLoading: false,
  error: null,

  // Load all available values from mock backend
  loadValues: async (): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const { getAllValues } = await import('../services/mockBackend');
      const values = await getAllValues();
      set({ availableValues: values, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load values',
        isLoading: false,
      });
    }
  },

  // Set current step explicitly (called when screen mounts)
  setCurrentStep: (step: ValuesSelectionStep): void => {
    const { currentStep } = get();
    
    // Dev mode logging
    if (__DEV__) {
      console.log(`[ValuesStore] Setting step: ${currentStep} → ${step}`);
    }
    
    set({ currentStep: step });
  },

  // Get current selections based on step
  getCurrentSelections: (): string[] => {
    const { currentStep, selectedAny, top20, top10, top5 } = get();
    switch (currentStep) {
      case ValuesSelectionStep.INITIAL:
        return [...selectedAny]; // Return copy to prevent mutations
      case ValuesSelectionStep.NARROW_20:
        return [...top20];
      case ValuesSelectionStep.NARROW_10:
        return [...top10];
      case ValuesSelectionStep.FINAL_5:
        return [...top5];
      default:
        return [];
    }
  },

  // Add a value (with validation based on current step) - idempotent
  addValue: (valueId: string): void => {
    const { currentStep, selectedAny, top20, top10, top5 } = get();
    const currentSelections = get().getCurrentSelections();

    // Defensive check: ensure valueId is valid
    if (!valueId || typeof valueId !== 'string') {
      if (__DEV__) {
        console.warn('[ValuesStore] addValue called with invalid valueId:', valueId);
      }
      return;
    }

    // Don't allow adding if already selected (idempotent check)
    if (currentSelections.includes(valueId)) {
      if (__DEV__) {
        console.log(`[ValuesStore] Value ${valueId} already selected in step ${currentStep}`);
      }
      return;
    }

    const requiredCount = getRequiredCount(currentStep);

    // Initial step: allow any number
    if (currentStep === ValuesSelectionStep.INITIAL) {
      // Prevent duplicates (idempotent)
      if (!selectedAny.includes(valueId)) {
        set({ selectedAny: [...selectedAny, valueId] });
        if (__DEV__) {
          console.log(`[ValuesStore] Added to selectedAny: ${valueId} (total: ${selectedAny.length + 1})`);
        }
      }
      return;
    }

    // Narrowing steps: enforce exact count
    if (requiredCount !== null) {
      if (currentSelections.length >= requiredCount) {
        // Already at max, can't add more
        if (__DEV__) {
          console.log(`[ValuesStore] Cannot add ${valueId}: already at max (${requiredCount}) for step ${currentStep}`);
        }
        return;
      }

      // Add to appropriate step's array (idempotent - check not already in that array)
      switch (currentStep) {
        case ValuesSelectionStep.NARROW_20:
          if (!top20.includes(valueId)) {
            set({ top20: [...top20, valueId] });
            if (__DEV__) {
              console.log(`[ValuesStore] Added to top20: ${valueId} (total: ${top20.length + 1})`);
            }
          }
          break;
        case ValuesSelectionStep.NARROW_10:
          if (!top10.includes(valueId)) {
            set({ top10: [...top10, valueId] });
            if (__DEV__) {
              console.log(`[ValuesStore] Added to top10: ${valueId} (total: ${top10.length + 1})`);
            }
          }
          break;
        case ValuesSelectionStep.FINAL_5:
          if (!top5.includes(valueId)) {
            set({ top5: [...top5, valueId] });
            if (__DEV__) {
              console.log(`[ValuesStore] Added to top5: ${valueId} (total: ${top5.length + 1})`);
            }
          }
          break;
      }
    }
  },

  // Remove a value from current step - idempotent
  removeValue: (valueId: string): void => {
    const { currentStep, selectedAny, top20, top10, top5 } = get();

    // Defensive check: ensure valueId is valid
    if (!valueId || typeof valueId !== 'string') {
      if (__DEV__) {
        console.warn('[ValuesStore] removeValue called with invalid valueId:', valueId);
      }
      return;
    }

    switch (currentStep) {
      case ValuesSelectionStep.INITIAL:
        if (selectedAny.includes(valueId)) {
          set({ selectedAny: selectedAny.filter((id) => id !== valueId) });
          if (__DEV__) {
            console.log(`[ValuesStore] Removed from selectedAny: ${valueId} (total: ${selectedAny.length - 1})`);
          }
        }
        break;
      case ValuesSelectionStep.NARROW_20:
        if (top20.includes(valueId)) {
          set({ top20: top20.filter((id) => id !== valueId) });
          if (__DEV__) {
            console.log(`[ValuesStore] Removed from top20: ${valueId} (total: ${top20.length - 1})`);
          }
        }
        break;
      case ValuesSelectionStep.NARROW_10:
        if (top10.includes(valueId)) {
          set({ top10: top10.filter((id) => id !== valueId) });
          if (__DEV__) {
            console.log(`[ValuesStore] Removed from top10: ${valueId} (total: ${top10.length - 1})`);
          }
        }
        break;
      case ValuesSelectionStep.FINAL_5:
        if (top5.includes(valueId)) {
          set({ top5: top5.filter((id) => id !== valueId) });
          if (__DEV__) {
            console.log(`[ValuesStore] Removed from top5: ${valueId} (total: ${top5.length - 1})`);
          }
        }
        break;
    }
  },

  // Check if user can proceed to next step
  canProceedToNextStep: (): boolean => {
    const { currentStep } = get();
    const currentSelections = get().getCurrentSelections();
    const requiredCount = getRequiredCount(currentStep);

    // Initial step: must have at least 1 value
    if (currentStep === ValuesSelectionStep.INITIAL) {
      return currentSelections.length >= 1;
    }

    // Narrowing steps: must have exactly the required count
    if (requiredCount !== null) {
      return currentSelections.length === requiredCount;
    }

    return false;
  },

  // Proceed to next step (with validation and data transfer)
  proceedToNextStep: (): void => {
    const { currentStep, canProceedToNextStep, selectedAny, top20, top10 } = get();

    if (!canProceedToNextStep()) {
      return; // Don't proceed if validation fails
    }

    let nextStep: ValuesSelectionStep;
    let updates: Partial<ValuesSelectionStore> = {};

    switch (currentStep) {
      case ValuesSelectionStep.INITIAL:
        nextStep = ValuesSelectionStep.NARROW_20;
        // Copy selectedAny to top20 for narrowing
        updates = { top20: [...selectedAny], currentStep: nextStep };
        break;
      case ValuesSelectionStep.NARROW_20:
        nextStep = ValuesSelectionStep.NARROW_10;
        // Copy top20 to top10 for narrowing
        updates = { top10: [...top20], currentStep: nextStep };
        break;
      case ValuesSelectionStep.NARROW_10:
        nextStep = ValuesSelectionStep.FINAL_5;
        // Copy top10 to top5 for final selection
        updates = { top5: [...top10], currentStep: nextStep };
        break;
      case ValuesSelectionStep.FINAL_5:
        nextStep = ValuesSelectionStep.COMPLETE;
        updates = { currentStep: nextStep };
        break;
      default:
        return;
    }

    set(updates);
  },

  // Go back to previous step - maintains data consistency
  goToPreviousStep: (): void => {
    const { currentStep, selectedAny, top20, top10 } = get();
    let previousStep: ValuesSelectionStep;

    switch (currentStep) {
      case ValuesSelectionStep.NARROW_20:
        previousStep = ValuesSelectionStep.INITIAL;
        // When going back from NARROW_20 to INITIAL:
        // - Keep selectedAny as is (user can adjust)
        // - Don't clear top20 (preserve their work)
        break;
      case ValuesSelectionStep.NARROW_10:
        previousStep = ValuesSelectionStep.NARROW_20;
        // When going back from NARROW_10 to NARROW_20:
        // - Keep top20 as is (user can adjust)
        // - Don't clear top10 (preserve their work)
        break;
      case ValuesSelectionStep.FINAL_5:
        previousStep = ValuesSelectionStep.NARROW_10;
        // When going back from FINAL_5 to NARROW_10:
        // - Keep top10 as is (user can adjust)
        // - Don't clear top5 (preserve their work)
        break;
      default:
        if (__DEV__) {
          console.warn(`[ValuesStore] Cannot go back from step: ${currentStep}`);
        }
        return;
    }

    if (__DEV__) {
      console.log(`[ValuesStore] Going back: ${currentStep} → ${previousStep}`);
      const currentSelections = get().getCurrentSelections();
      console.log(`[ValuesStore] Current selections count: ${currentSelections.length}`);
    }

    set({ currentStep: previousStep });
  },

  // Reset the entire flow
  reset: (): void => {
    set({
      selectedAny: [],
      top20: [],
      top10: [],
      top5: [],
      currentStep: ValuesSelectionStep.INITIAL,
      error: null,
    });
  },

  // Get required count for a step
  getRequiredCountForStep: (step: ValuesSelectionStep): number | null => {
    return getRequiredCount(step);
  },

  // Validate state consistency (dev mode helper)
  validateState: (): { isValid: boolean; errors: string[] } => {
    const { selectedAny, top20, top10, top5, currentStep } = get();
    const errors: string[] = [];

    // Check for duplicates
    const checkDuplicates = (arr: string[], name: string): void => {
      const seen = new Set<string>();
      arr.forEach((id) => {
        if (seen.has(id)) {
          errors.push(`Duplicate value ${id} in ${name}`);
        }
        seen.add(id);
      });
    };

    checkDuplicates(selectedAny, 'selectedAny');
    checkDuplicates(top20, 'top20');
    checkDuplicates(top10, 'top10');
    checkDuplicates(top5, 'top5');

    // Check step constraints
    if (currentStep === ValuesSelectionStep.NARROW_20 && top20.length > 20) {
      errors.push(`top20 has ${top20.length} values but should be <= 20`);
    }
    if (currentStep === ValuesSelectionStep.NARROW_10 && top10.length > 10) {
      errors.push(`top10 has ${top10.length} values but should be <= 10`);
    }
    if (currentStep === ValuesSelectionStep.FINAL_5 && top5.length > 5) {
      errors.push(`top5 has ${top5.length} values but should be <= 5`);
    }

    // Check that top20 only contains values from selectedAny
    const invalidInTop20 = top20.filter((id) => !selectedAny.includes(id));
    if (invalidInTop20.length > 0) {
      errors.push(`top20 contains values not in selectedAny: ${invalidInTop20.join(', ')}`);
    }

    // Check that top10 only contains values from top20
    const invalidInTop10 = top10.filter((id) => !top20.includes(id));
    if (invalidInTop10.length > 0) {
      errors.push(`top10 contains values not in top20: ${invalidInTop10.join(', ')}`);
    }

    // Check that top5 only contains values from top10
    const invalidInTop5 = top5.filter((id) => !top10.includes(id));
    if (invalidInTop5.length > 0) {
      errors.push(`top5 contains values not in top10: ${invalidInTop5.join(', ')}`);
    }

    if (__DEV__ && errors.length > 0) {
      console.warn('[ValuesStore] State validation errors:', errors);
      console.log('[ValuesStore] Current state:', {
        currentStep,
        selectedAny: selectedAny.length,
        top20: top20.length,
        top10: top10.length,
        top5: top5.length,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
}));
