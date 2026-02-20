/**
 * Birthday picker - Discover card style.
 * Tap to open native date picker; shows formatted date or "Select Birthday".
 * Validates 18+ (max date = 18 years ago).
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  formatBirthdayDisplay,
  calculateAge,
  birthdayToISOString,
  getMaxBirthdayDate,
  getMinBirthdayDate,
} from '../utils/dateUtils';
import { theme } from '../theme';

export interface BirthdayPickerProps {
  /** Current value (Date or ISO string). */
  value: Date | string | null | undefined;
  onChange: (birthday: Date, age: number, birthdayISO: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const BirthdayPicker: React.FC<BirthdayPickerProps> = ({
  value,
  onChange,
  label = 'Birthday *',
  error,
  disabled = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const dateValue =
    value == null
      ? getMaxBirthdayDate()
      : typeof value === 'string'
        ? new Date(value)
        : value;

  const pickerDate = tempDate ?? dateValue;
  const displayText = formatBirthdayDisplay(value ?? null);
  const age = value != null ? calculateAge(value) : null;

  const handleConfirm = (event: { type: string }, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    const date = selectedDate ?? dateValue;
    if (event.type === 'set') {
      const ageYears = calculateAge(date);
      onChange(date, ageYears, birthdayToISOString(date));
    }
  };

  const handleAndroidConfirm = (event: { type: string }, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selectedDate) {
      const ageYears = calculateAge(selectedDate);
      onChange(selectedDate, ageYears, birthdayToISOString(selectedDate));
    }
  };

  const openPicker = () => {
    setTempDate(null);
    setShowPicker(true);
  };

  const closePicker = () => {
    setShowPicker(false);
    setTempDate(null);
  };

  const handleDone = () => {
    const ageYears = calculateAge(pickerDate);
    onChange(pickerDate, ageYears, birthdayToISOString(pickerDate));
    closePicker();
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.touchable, error ? styles.touchableError : null, disabled && styles.touchableDisabled]}
        onPress={() => !disabled && openPicker()}
        activeOpacity={0.7}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityHint="Opens date picker to select your birthday"
      >
        <Text style={[styles.valueText, !value && styles.placeholder]}>{displayText}</Text>
        {age != null && age >= 18 && (
          <Text style={styles.ageHint}>You're {age}!</Text>
        )}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closePicker}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closePicker} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>When's your birthday?</Text>
                <TouchableOpacity onPress={handleDone} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={(_, d) => d && setTempDate(d)}
                maximumDate={getMaxBirthdayDate()}
                minimumDate={getMinBirthdayDate()}
                themeVariant="light"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      ) : (
        showPicker && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="default"
            onChange={handleAndroidConfirm}
            maximumDate={getMaxBirthdayDate()}
            minimumDate={getMinBirthdayDate()}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    minHeight: 48,
  },
  touchableError: {
    borderColor: theme.colors.error,
  },
  touchableDisabled: {
    opacity: 0.6,
  },
  valueText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    flex: 1,
  },
  placeholder: {
    color: theme.colors.textTertiary,
  },
  ageHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  chevron: {
    fontSize: 20,
    color: theme.colors.textTertiary,
  },
  error: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing['2xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cancelText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  doneText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
});
