import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../theme';
import { MatchFilters } from '../store/matchesStore';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { RangeSlider } from './RangeSlider';
import { SingleValueSlider } from './SingleValueSlider';

interface FiltersSheetProps {
  visible: boolean;
  filters: MatchFilters;
  onClose: () => void;
  onApply: (next: MatchFilters) => Promise<void> | void;
  onReset: () => Promise<void> | void;
}

const DEFAULT_AGE_RANGE: [number, number] = [18, 99];
const DEFAULT_RADIUS_KM = 200;

export const FiltersSheet: React.FC<FiltersSheetProps> = ({
  visible,
  filters,
  onClose,
  onApply,
  onReset,
}) => {
  const initialAgeRange = useMemo<[number, number]>(() => {
    const ar = filters.ageRange;
    if (Array.isArray(ar) && ar.length === 2) return [ar[0], ar[1]];
    return DEFAULT_AGE_RANGE;
  }, [filters.ageRange]);

  const initialRadius = typeof filters.radiusKm === 'number' ? filters.radiusKm : DEFAULT_RADIUS_KM;

  const [ageRange, setAgeRange] = useState<[number, number]>(initialAgeRange);
  const [radiusKm, setRadiusKm] = useState<number>(initialRadius);

  // When opening, sync draft state from store filters.
  useEffect(() => {
    if (!visible) return;
    setAgeRange(initialAgeRange);
    setRadiusKm(initialRadius);
  }, [visible, initialAgeRange, initialRadius]);

  const apply = async (): Promise<void> => {
    const next: MatchFilters = {
      ageRange,
      radiusKm,
    };
    await onApply(next);
    onClose();
  };

  const reset = async (): Promise<void> => {
    setAgeRange(DEFAULT_AGE_RANGE);
    setRadiusKm(DEFAULT_RADIUS_KM);
    await onReset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Tap-outside target (behind sheet) */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close filters">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Age range</Text>
            <Text style={styles.valueText}>
              Ages {ageRange[0]}–{ageRange[1]}
            </Text>
            <RangeSlider
              min={18}
              max={99}
              step={1}
              value={ageRange}
              onChange={setAgeRange}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distance</Text>
            <Text style={styles.hint}>Within {radiusKm} km of your profile location</Text>
            <Text style={styles.valueText}>Within {radiusKm} km</Text>
            <SingleValueSlider
              min={5}
              max={200}
              step={5}
              value={radiusKm}
              onChange={setRadiusKm}
            />
          </View>

          <View style={styles.actions}>
            <SecondaryButton title="Reset" onPress={reset} style={styles.actionBtn} />
            <PrimaryButton title="Apply" onPress={apply} style={styles.actionBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  close: {
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  valueText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionBtn: {
    flex: 1,
  },
});

