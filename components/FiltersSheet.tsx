import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../theme';
import { MatchFilters } from '../store/matchesStore';
import { SingleValueSlider } from './SingleValueSlider';
import { RangeSlider } from './RangeSlider';

interface FiltersSheetProps {
  visible: boolean;
  filters: MatchFilters;
  onClose: () => void;
  onApply: (next: MatchFilters) => Promise<void> | void;
  onReset: () => Promise<void> | void;
}

const DEFAULT_AGE_RANGE: [number, number] = [18, 122];
const DEFAULT_RADIUS_MILES = 20;
const RADIUS_MIN_MILES = 1;
const RADIUS_MAX_MILES = 100;
const RADIUS_STEP_MILES = 1;

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
  const initialRadius = typeof filters.radiusMiles === 'number' ? filters.radiusMiles : DEFAULT_RADIUS_MILES;

  const [ageRange, setAgeRange] = useState<[number, number]>(initialAgeRange);
  const [radiusMiles, setRadiusMiles] = useState<number>(initialRadius);

  useEffect(() => {
    if (!visible) return;
    setAgeRange(initialAgeRange);
    setRadiusMiles(initialRadius);
  }, [visible, initialAgeRange, initialRadius]);

  /** Save current draft and close. Used for tap-outside and close X. */
  const saveAndClose = async (): Promise<void> => {
    const next: MatchFilters = {
      ...filters,
      ageRange,
      radiusMiles,
    };
    await onApply(next);
    onClose();
  };

  /** Reset filters to defaults and notify parent. */
  const handleReset = async (): Promise<void> => {
    setAgeRange(DEFAULT_AGE_RANGE);
    setRadiusMiles(DEFAULT_RADIUS_MILES);
    await onReset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={saveAndClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Tap outside overlay (top/bottom): save and close */}
        <Pressable style={styles.tapOutside} onPress={saveAndClose} accessibilityLabel="Save and close filters" />

        <View style={styles.sheet} pointerEvents="box-none">
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={handleReset} hitSlop={12} style={styles.resetButton} accessibilityLabel="Reset filters">
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
              <Pressable onPress={saveAndClose} hitSlop={12} accessibilityLabel="Close filters">
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Age range</Text>
            <Text style={styles.valueText}>Ages {ageRange[0]}–{ageRange[1]}</Text>
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
            <Text style={styles.valueText}>Within {Math.round(radiusMiles)} miles</Text>
            <SingleValueSlider
              min={RADIUS_MIN_MILES}
              max={RADIUS_MAX_MILES}
              step={RADIUS_STEP_MILES}
              value={radiusMiles}
              onChange={setRadiusMiles}
            />
          </View>
        </View>

        {/* Tap outside below sheet */}
        <Pressable style={styles.tapOutside} onPress={saveAndClose} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  tapOutside: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  resetButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  resetText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
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
});
