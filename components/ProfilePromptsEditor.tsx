import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { TextInputField } from './TextInputField';
import { theme } from '../theme';
import { Prompt } from '../types/user';
import { AVAILABLE_PROMPTS } from '../constants/prompts';

interface ProfilePromptsEditorProps {
  prompts: Prompt[];
  onChange: (next: Prompt[]) => void;
  maxPrompts?: number;
  error?: string | null;
}

function makeLocalId(): string {
  return `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePrompt(p: Prompt): Prompt {
  return {
    id: p.id,
    question: p.question ?? '',
    answer: p.answer ?? '',
    isCustom: !!p.isCustom,
  };
}

export const ProfilePromptsEditor: React.FC<ProfilePromptsEditorProps> = ({
  prompts,
  onChange,
  maxPrompts = 3,
  error,
}) => {
  const safePrompts = useMemo(() => (Array.isArray(prompts) ? prompts.map(normalizePrompt) : []), [prompts]);

  const [pickerOpenForId, setPickerOpenForId] = useState<string | null>(null);

  const addPrompt = (): void => {
    if (safePrompts.length >= maxPrompts) return;
    onChange([
      ...safePrompts,
      { id: makeLocalId(), question: '', answer: '', isCustom: false },
    ]);
  };

  const removePrompt = (id: string): void => {
    onChange(safePrompts.filter((p) => p.id !== id));
  };

  const updatePrompt = (id: string, patch: Partial<Prompt>): void => {
    onChange(
      safePrompts.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Prompts</Text>
        <Text style={styles.hint}>Add at least 1</Text>
      </View>

      {safePrompts.map((p, idx) => {
        const showPicker = pickerOpenForId === p.id;
        return (
          <View key={p.id} style={styles.promptCard}>
            <View style={styles.promptTopRow}>
              <Text style={styles.promptIndex}>Prompt {idx + 1}</Text>
              <TouchableOpacity onPress={() => removePrompt(p.id)} activeOpacity={0.7}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>

            {!p.isCustom ? (
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setPickerOpenForId(p.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.pickerButtonText} numberOfLines={2}>
                  {p.question?.trim() ? p.question : 'Choose a suggested prompt'}
                </Text>
                <Text style={styles.pickerChevron}>▾</Text>
              </TouchableOpacity>
            ) : (
              <TextInputField
                label="Custom prompt"
                placeholder="Write your own prompt..."
                value={p.question}
                onChangeText={(text) => updatePrompt(p.id, { question: text, isCustom: true })}
                autoCapitalize="sentences"
                returnKeyType="next"
              />
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => {
                  updatePrompt(p.id, { isCustom: false });
                  setPickerOpenForId(p.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.actionLink}>Pick from list</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updatePrompt(p.id, { isCustom: true, question: p.isCustom ? p.question : '' })}
                activeOpacity={0.7}
              >
                <Text style={styles.actionLink}>Write custom</Text>
              </TouchableOpacity>
            </View>

            <TextInputField
              label="Answer"
              placeholder="Your answer..."
              value={p.answer}
              onChangeText={(text) => updatePrompt(p.id, { answer: text })}
              autoCapitalize="sentences"
              multiline
              numberOfLines={3}
              style={styles.answerInput}
            />

            <Modal
              visible={showPicker}
              transparent
              animationType="slide"
              onRequestClose={() => setPickerOpenForId(null)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Choose a prompt</Text>
                  <ScrollView style={styles.modalScroll}>
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        updatePrompt(p.id, { isCustom: true, question: '' });
                        setPickerOpenForId(null);
                      }}
                    >
                      <Text style={styles.modalOptionText}>Write my own…</Text>
                    </TouchableOpacity>
                    {AVAILABLE_PROMPTS.map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        style={styles.modalOption}
                        onPress={() => {
                          updatePrompt(p.id, { question: opt.question, isCustom: false });
                          setPickerOpenForId(null);
                        }}
                      >
                        <Text style={styles.modalOptionText}>{opt.question}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity style={styles.modalCancel} onPress={() => setPickerOpenForId(null)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        );
      })}

      {safePrompts.length < maxPrompts ? (
        <TouchableOpacity style={styles.addButton} onPress={addPrompt} activeOpacity={0.8}>
          <Text style={styles.addButtonText}>+ Add Prompt</Text>
        </TouchableOpacity>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  promptCard: {
    padding: theme.spacing.base,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  promptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  promptIndex: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  removeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.backgroundTertiary,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  pickerChevron: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  actionLink: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  answerInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.sm,
  },
  addButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  errorText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.base,
    color: theme.colors.text,
  },
  modalScroll: {
    marginBottom: theme.spacing.base,
  },
  modalOption: {
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalOptionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
  },
  modalCancel: {
    padding: theme.spacing.base,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalCancelText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

