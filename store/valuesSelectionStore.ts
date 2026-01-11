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
  addValue: (valueId: string) => void;
  removeValue: (valueId: string) => void;
  canProceedToNextStep: () => boolean;
  proceedToNextStep: () => void;
  goToPreviousStep: () => void;
  reset: () => void;
  getCurrentSelections: () => string[];
  getRequiredCountForStep: (step: ValuesSelectionStep) => number | null;
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

  // Get current selections based on step
  getCurrentSelections: (): string[] => {
    const { currentStep, selectedAny, top20, top10, top5 } = get();
    switch (currentStep) {
      case ValuesSelectionStep.INITIAL:
        return selectedAny;
      case ValuesSelectionStep.NARROW_20:
        return top20;
      case ValuesSelectionStep.NARROW_10:
        return top10;
      case ValuesSelectionStep.FINAL_5:
        return top5;
      default:
        return [];
    }
  },

  // Add a value (with validation based on current step)
  addValue: (valueId: string): void => {
    const { currentStep, selectedAny, top20, top10, top5 } = get();
    const currentSelections = get().getCurrentSelections();

    // Don't allow adding if already selected
    if (currentSelections.includes(valueId)) {
      return;
    }

    const requiredCount = getRequiredCount(currentStep);

    // Initial step: allow any number
    if (currentStep === ValuesSelectionStep.INITIAL) {
      set({ selectedAny: [...selectedAny, valueId] });
      return;
    }

    // Narrowing steps: enforce exact count
    if (requiredCount !== null) {
      if (currentSelections.length >= requiredCount) {
        // Already at max, can't add more
        return;
      }

      // Add to appropriate step's array
      switch (currentStep) {
        case ValuesSelectionStep.NARROW_20:
          set({ top20: [...top20, valueId] });
          break;
        case ValuesSelectionStep.NARROW_10:
          set({ top10: [...top10, valueId] });
          break;
        case ValuesSelectionStep.FINAL_5:
          set({ top5: [...top5, valueId] });
          break;
      }
    }
  },

  // Remove a value from current step
  removeValue: (valueId: string): void => {
    const { currentStep, selectedAny, top20, top10, top5 } = get();

    switch (currentStep) {
      case ValuesSelectionStep.INITIAL:
        set({ selectedAny: selectedAny.filter((id) => id !== valueId) });
        break;
      case ValuesSelectionStep.NARROW_20:
        set({ top20: top20.filter((id) => id !== valueId) });
        break;
      case ValuesSelectionStep.NARROW_10:
        set({ top10: top10.filter((id) => id !== valueId) });
        break;
      case ValuesSelectionStep.FINAL_5:
        set({ top5: top5.filter((id) => id !== valueId) });
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

  // Go back to previous step
  goToPreviousStep: (): void => {
    const { currentStep } = get();
    let previousStep: ValuesSelectionStep;

    switch (currentStep) {
      case ValuesSelectionStep.NARROW_20:
        previousStep = ValuesSelectionStep.INITIAL;
        break;
      case ValuesSelectionStep.NARROW_10:
        previousStep = ValuesSelectionStep.NARROW_20;
        break;
      case ValuesSelectionStep.FINAL_5:
        previousStep = ValuesSelectionStep.NARROW_10;
        break;
      default:
        return;
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
}));
