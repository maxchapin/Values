import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { ReportReason } from '../services/supabaseSafety';
import { theme } from '../theme';

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'harassment', label: 'Harassment or threats' },
  { key: 'fake_profile', label: 'Fake or scam profile' },
  { key: 'inappropriate_content', label: 'Inappropriate content' },
  { key: 'other', label: 'Other' },
];

export interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => Promise<void>;
  reportedDisplayName?: string;
  /** e.g. "Reporting a specific message" — shown when reporting a piece of content rather than the account. */
  contextLabel?: string;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
  visible,
  onClose,
  onSubmit,
  reportedDisplayName,
  contextLabel,
}) => {
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setReason('harassment');
    setDetails('');
    setError(null);
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (submitting) return;
    reset();
    onClose();
  }, [submitting, onClose, reset]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(reason, details.trim());
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }, [reason, details, onSubmit, onClose, reset]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropPress} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Report {reportedDisplayName ? reportedDisplayName : 'user'}</Text>
          {contextLabel ? <Text style={styles.contextLabel}>{contextLabel}</Text> : null}
          <Text style={styles.hint}>Reports are reviewed by our team. This user won’t be notified.</Text>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {REASONS.map((r) => (
              <Pressable
                key={r.key}
                style={[styles.reasonRow, reason === r.key && styles.reasonRowActive]}
                onPress={() => setReason(r.key)}
              >
                <Text
                  style={[styles.reasonText, reason === r.key && styles.reasonTextActive]}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}

            <Text style={styles.detailsLabel}>Details (optional)</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="Add context…"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              maxLength={2000}
              value={details}
              onChangeText={setDetails}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.submitBtnText}>Submit report</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
  },
  backdropPress: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingBottom: theme.spacing.lg,
    maxHeight: '88%',
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  contextLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.base,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    maxHeight: 360,
  },
  reasonRow: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  reasonRowActive: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background,
  },
  reasonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
  },
  reasonTextActive: {
    fontWeight: theme.typography.fontWeight.semibold,
  },
  detailsLabel: {
    marginTop: theme.spacing.base,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  detailsInput: {
    marginTop: theme.spacing.xs,
    minHeight: 80,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.base,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textInverse,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
