/**
 * Minimal feedback flow: modal with text input, submit/cancel.
 * Uses theme tokens; integrates with feedbackService for submit.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { submitFeedback, SubmitFeedbackResult } from '../services/feedbackService';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  /** Optional context (e.g. "discover_empty") for backend. */
  context?: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  context = 'discover_empty',
}) => {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const cardMaxWidth = Math.min(width - theme.spacing.xl * 2, 360);

  const reset = () => {
    setText('');
    setStatus('idle');
    setErrorMessage(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const result: SubmitFeedbackResult = await submitFeedback(text, context);
    if (result.success && !result.error) {
      setStatus('success');
      setErrorMessage(null);
      setTimeout(handleClose, 1800);
    } else {
      setStatus('error');
      setErrorMessage(result.error ?? 'Something went wrong. Please try again.');
    }
  };

  const handleSubmitPress = () => {
    if (status === 'submitting') return;
    setStatus('submitting');
    setErrorMessage(null);
    handleSubmit();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
      accessibilityViewIsModal
      accessibilityLabel="Send feedback"
    >
      <View style={styles.container}>
        <Pressable
          style={styles.overlay}
          onPress={handleClose}
          accessibilityLabel="Close feedback"
          accessibilityRole="button"
        />
        <View style={styles.centeredWrap} pointerEvents="box-none">
          <KeyboardAvoidingView
            style={styles.centered}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={styles.cardWrap}>
          <View style={[styles.card, { maxWidth: cardMaxWidth }]}>
            <Text style={styles.title}>Send feedback</Text>
            {status === 'success' ? (
              <Text style={styles.successText}>Thanks! We've received your feedback.</Text>
            ) : (
              <>
                <Text style={styles.hint}>
                  Tell us what you're looking for or how we can improve your matches.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your feedback..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={text}
                  onChangeText={setText}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  editable={status !== 'submitting'}
                  accessibilityLabel="Feedback text"
                />
                {errorMessage ? (
                  <Text style={styles.errorText} numberOfLines={2}>
                    {errorMessage}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  <SecondaryButton
                    title="Cancel"
                    onPress={handleClose}
                    disabled={status === 'submitting'}
                    style={styles.cancelButton}
                  />
                  <PrimaryButton
                    title={status === 'submitting' ? 'Sending…' : 'Submit'}
                    onPress={handleSubmitPress}
                    disabled={status === 'submitting' || !text.trim()}
                    loading={status === 'submitting'}
                    style={styles.submitButton}
                  />
                </View>
              </>
            )}
          </View>
        </Pressable>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  centeredWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  centered: {
    width: '100%',
    alignItems: 'center',
  },
  cardWrap: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    ...theme.shadows.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.base,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.base,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.base,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  successText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.success,
    marginBottom: theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.base,
    marginTop: theme.spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
