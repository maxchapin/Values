import { useState, useCallback } from 'react';

/**
 * Validation function type
 * Returns error message string if invalid, undefined if valid
 */
export type ValidationRule<T = string> = (value: T) => string | undefined;

/**
 * Form field configuration
 */
export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
  rules?: ValidationRule<T>[];
}

/**
 * Form state type
 */
export type FormState<T extends Record<string, any>> = {
  [K in keyof T]: FormField<T[K]>;
};

/**
 * Form errors type
 */
export type FormErrors<T extends Record<string, any>> = {
  [K in keyof T]?: string;
};

/**
 * useForm hook for managing form state, validation, and errors
 * 
 * @template T - The form data shape
 * @param initialValues - Initial form values
 * @param validationRules - Optional validation rules for each field
 * @returns Form utilities and state
 * 
 * @example
 * const { values, errors, touched, setValue, setFieldTouched, validate, handleSubmit, reset } = useForm({
 *   email: '',
 *   name: '',
 * }, {
 *   email: [
 *     (v) => !v ? 'Email is required' : undefined,
 *     (v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email format' : undefined,
 *   ],
 *   name: [
 *     (v) => !v.trim() ? 'Name is required' : undefined,
 *     (v) => v.trim().length < 2 ? 'Name must be at least 2 characters' : undefined,
 *   ],
 * });
 */
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationRules?: Partial<{
    [K in keyof T]: ValidationRule<T[K]>[];
  }>
) {
  // Initialize form state
  const [formState, setFormState] = useState<FormState<T>>(() => {
    const state = {} as FormState<T>;
    for (const key in initialValues) {
      state[key] = {
        value: initialValues[key],
        error: undefined,
        touched: false,
        rules: validationRules?.[key],
      };
    }
    return state;
  });

  /**
   * Set a field value
   */
  const setValue = useCallback(<K extends keyof T>(
    field: K,
    value: T[K],
    validateImmediately = false
  ): void => {
    setFormState((prev) => {
      const fieldState = prev[field];
      let error: string | undefined = undefined;

      // Validate if rules exist and validation is requested
      if (validateImmediately && fieldState.rules) {
        for (const rule of fieldState.rules) {
          const ruleError = rule(value);
          if (ruleError) {
            error = ruleError;
            break;
          }
        }
      }

      return {
        ...prev,
        [field]: {
          ...fieldState,
          value,
          error: validateImmediately ? error : fieldState.error,
        },
      };
    });
  }, []);

  /**
   * Mark a field as touched
   */
  const setFieldTouched = useCallback(<K extends keyof T>(field: K, touched = true): void => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        touched,
      },
    }));
  }, []);

  /**
   * Validate a single field
   */
  const validateField = useCallback(<K extends keyof T>(field: K): string | undefined => {
    const fieldState = formState[field];
    if (!fieldState.rules) {
      return undefined;
    }

    for (const rule of fieldState.rules) {
      const error = rule(fieldState.value);
      if (error) {
        setFormState((prev) => ({
          ...prev,
          [field]: {
            ...prev[field],
            error,
            touched: true,
          },
        }));
        return error;
      }
    }

    // Clear error if validation passes
    if (fieldState.error) {
      setFormState((prev) => ({
        ...prev,
        [field]: {
          ...prev[field],
          error: undefined,
        },
      }));
    }

    return undefined;
  }, [formState]);

  /**
   * Validate all fields
   */
  const validate = useCallback((): boolean => {
    let isValid = true;
    const newState = { ...formState };

    for (const key in formState) {
      const fieldState = formState[key];
      if (!fieldState.rules) {
        continue;
      }

      let error: string | undefined = undefined;
      for (const rule of fieldState.rules) {
        const ruleError = rule(fieldState.value);
        if (ruleError) {
          error = ruleError;
          isValid = false;
          break;
        }
      }

      newState[key] = {
        ...fieldState,
        error,
        touched: true,
      };
    }

    setFormState(newState);
    return isValid;
  }, [formState]);

  /**
   * Validate all fields and mark them as touched
   */
  const validateAll = useCallback((): boolean => {
    let isValid = true;
    const newState = { ...formState };

    for (const key in formState) {
      const fieldState = formState[key];
      if (!fieldState.rules) {
        newState[key] = { ...fieldState, touched: true };
        continue;
      }

      let error: string | undefined = undefined;
      for (const rule of fieldState.rules) {
        const ruleError = rule(fieldState.value);
        if (ruleError) {
          error = ruleError;
          isValid = false;
          break;
        }
      }

      newState[key] = {
        ...fieldState,
        error,
        touched: true,
      };
    }

    setFormState(newState);
    return isValid;
  }, [formState]);

  /**
   * Reset form to initial values
   */
  const reset = useCallback((): void => {
    const state = {} as FormState<T>;
    for (const key in initialValues) {
      state[key] = {
        value: initialValues[key],
        error: undefined,
        touched: false,
        rules: validationRules?.[key],
      };
    }
    setFormState(state);
  }, [initialValues, validationRules]);

  /**
   * Get current form values
   */
  const values = {} as T;
  for (const key in formState) {
    values[key] = formState[key].value;
  }

  /**
   * Get current form errors
   */
  const errors = {} as FormErrors<T>;
  for (const key in formState) {
    if (formState[key].error) {
      errors[key] = formState[key].error;
    }
  }

  /**
   * Get touched state
   */
  const touched = {} as { [K in keyof T]: boolean };
  for (const key in formState) {
    touched[key] = formState[key].touched;
  }

  /**
   * Check if form is valid
   */
  const isValid = Object.values(errors).length === 0;

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((
    onSubmit: (values: T) => void | Promise<void>
  ) => {
    return async (): Promise<void> => {
      if (validateAll()) {
        await onSubmit(values);
      }
    };
  }, [validateAll, values]);

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setFieldTouched,
    validateField,
    validate,
    validateAll,
    handleSubmit,
    reset,
  };
}

/**
 * Common validation rules
 */
export const validators = {
  required: <T>(message = 'This field is required'): ValidationRule<T> => {
    return (value: T) => {
      if (value === null || value === undefined) {
        return message;
      }
      if (typeof value === 'string' && !value.trim()) {
        return message;
      }
      if (Array.isArray(value) && value.length === 0) {
        return message;
      }
      return undefined;
    };
  },

  email: (message = 'Invalid email format'): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return undefined; // Let required handle empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? undefined : message;
    };
  },

  minLength: (min: number, message?: string): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return undefined; // Let required handle empty
      const msg = message || `Must be at least ${min} characters`;
      return value.trim().length >= min ? undefined : msg;
    };
  },

  maxLength: (max: number, message?: string): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return undefined; // Let required handle empty
      const msg = message || `Must be no more than ${max} characters`;
      return value.trim().length <= max ? undefined : msg;
    };
  },

  min: (min: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value === null || value === undefined) return undefined;
      const msg = message || `Must be at least ${min}`;
      return value >= min ? undefined : msg;
    };
  },

  max: (max: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value === null || value === undefined) return undefined;
      const msg = message || `Must be no more than ${max}`;
      return value <= max ? undefined : msg;
    };
  },

  range: (min: number, max: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value === null || value === undefined) return undefined;
      const msg = message || `Must be between ${min} and ${max}`;
      return value >= min && value <= max ? undefined : msg;
    };
  },
};
