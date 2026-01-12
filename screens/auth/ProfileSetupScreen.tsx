import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextInputField } from '../../components/TextInputField';
import { trackScreenView, trackProfileCompleted, setUserProperties } from '../../services/analytics';
import { theme } from '../../theme';
import { useUserStore } from '../../store/userStore';
import { useForm, validators } from '../../hooks/useForm';
import { RootStackParamList } from '../../navigation/types';
import { Gender, Prompt } from '../../types/user';
import { AVAILABLE_PROMPTS } from '../../constants/prompts';

type ProfileSetupScreenProps = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

interface PromptAnswer {
  promptId: string;
  question: string;
  answer: string;
}

interface ProfileFormData {
  name: string;
  age: string;
  location: string;
  job: string;
  education: string;
  bio: string;
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ navigation }) => {
  const { currentUser, createOrUpdateUser, isLoading } = useUserStore();

  useEffect(() => {
    trackScreenView('ProfileSetup');
  }, []);

  // Form state using useForm hook
  const {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    handleSubmit,
  } = useForm<ProfileFormData>(
    {
      name: currentUser?.name || '',
      age: currentUser?.age.toString() || '',
      location: currentUser?.location || '',
      job: currentUser?.job || '',
      education: currentUser?.education || '',
      bio: currentUser?.bio || '',
    },
    {
      name: [
        validators.required('Name is required'),
        validators.minLength(2, 'Name must be at least 2 characters'),
      ],
      age: [
        validators.required('Age is required'),
        (value: string) => {
          if (!value.trim()) {
            return undefined; // Let required handle empty
          }
          const ageNum = parseInt(value, 10);
          if (isNaN(ageNum)) {
            return 'Age must be a number';
          }
          if (ageNum < 18 || ageNum > 100) {
            return 'Age must be between 18 and 100';
          }
          return undefined;
        },
      ],
      location: [
        validators.required('Location is required'),
        validators.minLength(2, 'Location must be at least 2 characters'),
      ],
      job: [],
      education: [],
      bio: [
        validators.required('Bio is required'),
        validators.minLength(10, 'Bio must be at least 10 characters'),
      ],
    }
  );

  // Separate state for complex fields
  const [gender, setGender] = useState<Gender>(currentUser?.gender || 'prefer-not-to-say');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
  const [promptAnswers, setPromptAnswers] = useState<PromptAnswer[]>(
    currentUser?.prompts.map((p) => ({
      promptId: p.id,
      question: p.question,
      answer: p.answer,
    })) || []
  );

  // Add a prompt answer
  const addPrompt = (): void => {
    if (promptAnswers.length >= 3) return;

    // Find first available prompt not already selected
    const usedPromptIds = promptAnswers.map((pa) => pa.promptId);
    const availablePrompt = AVAILABLE_PROMPTS.find((p) => !usedPromptIds.includes(p.id));

    if (availablePrompt) {
      setPromptAnswers([
        ...promptAnswers,
        { promptId: availablePrompt.id, question: availablePrompt.question, answer: '' },
      ]);
    }
  };

  // Remove a prompt answer
  const removePrompt = (index: number): void => {
    setPromptAnswers(promptAnswers.filter((_, i) => i !== index));
  };

  // Update prompt answer
  const updatePromptAnswer = (index: number, answer: string): void => {
    const updated = [...promptAnswers];
    updated[index].answer = answer;
    setPromptAnswers(updated);
  };

  // Change prompt question
  const changePromptQuestion = (index: number, promptId: string): void => {
    const selectedPrompt = AVAILABLE_PROMPTS.find((p) => p.id === promptId);
    if (!selectedPrompt) return;

    const updated = [...promptAnswers];
    updated[index].promptId = promptId;
    updated[index].question = selectedPrompt.question;
    setPromptAnswers(updated);
  };

  // Validation for prompts (separate from form validation)
  const hasValidPrompts = (): boolean => {
    return promptAnswers.length >= 1 && promptAnswers.every((pa) => pa.answer.trim().length > 0);
  };

  const onSubmit = async (formValues: ProfileFormData): Promise<void> => {
    // Additional validation for prompts
    if (!hasValidPrompts()) {
      return;
    }

    const ageNum = parseInt(formValues.age, 10);
    const prompts: Prompt[] = promptAnswers.map((pa) => ({
      id: pa.promptId,
      question: pa.question,
      answer: pa.answer.trim(),
    }));

    const profileData = {
      email: currentUser?.email || '',
      name: formValues.name.trim(),
      age: ageNum,
      gender,
      location: formValues.location.trim(),
      job: formValues.job.trim() || undefined,
      education: formValues.education.trim() || undefined,
      bio: formValues.bio.trim(),
      prompts,
    };

    await createOrUpdateUser(profileData);

    // Track profile completion
    trackProfileCompleted({
      age: ageNum,
      hasJob: !!profileData.job,
      hasEducation: !!profileData.education,
      promptsCount: prompts.length,
    });

    // Set user properties for analytics
    setUserProperties({
      age: ageNum,
      gender,
      location: profileData.location,
    });

    // Navigate to values selection flow
    navigation.navigate('ValuesSelection');
  };

  return (
    <ScreenContainer scrollable scrollViewProps={{ contentContainerStyle: styles.contentContainer }}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Tell us about yourself to help us find your perfect match</Text>
      </View>

      <View style={styles.form}>
        {/* Name */}
        <TextInputField
          label="Name *"
          placeholder="Enter your name"
          value={values.name}
          onChangeText={(text) => {
            setValue('name', text, true);
          }}
          onBlur={() => setFieldTouched('name')}
          error={touched.name ? errors.name : undefined}
          autoCapitalize="words"
        />

        {/* Age */}
        <TextInputField
          label="Age *"
          placeholder="Enter your age"
          value={values.age}
          onChangeText={(text) => {
            setValue('age', text, true);
          }}
          onBlur={() => setFieldTouched('age')}
          error={touched.age ? errors.age : undefined}
          keyboardType="number-pad"
        />

        {/* Gender */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender *</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowGenderPicker(true)}
          >
            <Text style={styles.pickerText}>
              {gender === 'male' ? 'Male' :
               gender === 'female' ? 'Female' :
               gender === 'non-binary' ? 'Non-binary' :
               'Prefer not to say'}
            </Text>
          </TouchableOpacity>
          <Modal
            visible={showGenderPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowGenderPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Gender</Text>
                {(['male', 'female', 'non-binary', 'prefer-not-to-say'] as Gender[]).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.modalOption, gender === g && styles.modalOptionSelected]}
                    onPress={() => {
                      setGender(g);
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, gender === g && styles.modalOptionTextSelected]}>
                      {g === 'male' ? 'Male' :
                       g === 'female' ? 'Female' :
                       g === 'non-binary' ? 'Non-binary' :
                       'Prefer not to say'}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowGenderPicker(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>

        {/* Location */}
        <TextInputField
          label="Location *"
          placeholder="City, State"
          value={values.location}
          onChangeText={(text) => {
            setValue('location', text, true);
          }}
          onBlur={() => setFieldTouched('location')}
          error={touched.location ? errors.location : undefined}
          autoCapitalize="words"
        />

        {/* Job */}
        <TextInputField
          label="Job"
          placeholder="What do you do?"
          value={values.job}
          onChangeText={(text) => {
            setValue('job', text, true);
          }}
          onBlur={() => setFieldTouched('job')}
          error={touched.job ? errors.job : undefined}
          autoCapitalize="words"
        />

        {/* Education */}
        <TextInputField
          label="Education"
          placeholder="Your education level or degree"
          value={values.education}
          onChangeText={(text) => {
            setValue('education', text, true);
          }}
          onBlur={() => setFieldTouched('education')}
          error={touched.education ? errors.education : undefined}
          autoCapitalize="words"
        />

        {/* Bio */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio *</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              touched.bio && errors.bio && styles.inputError,
            ]}
            placeholder="Tell us about yourself..."
            value={values.bio}
            onChangeText={(text) => {
              setValue('bio', text, true);
            }}
            onBlur={() => setFieldTouched('bio')}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={theme.colors.textTertiary}
          />
          {touched.bio && errors.bio && (
            <Text style={styles.errorText}>{errors.bio}</Text>
          )}
        </View>

        {/* Prompts Section */}
        <View style={styles.inputGroup}>
          <View style={styles.promptsHeader}>
            <Text style={styles.label}>Prompts *</Text>
            {promptAnswers.length < 3 && (
              <TouchableOpacity onPress={addPrompt} style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Add Prompt</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.hint}>Add 1-3 prompts to help others get to know you</Text>

          {promptAnswers.map((promptAnswer, index) => (
            <View key={index} style={styles.promptContainer}>
              <View style={styles.promptHeader}>
                <TouchableOpacity
                  style={[styles.input, { flex: 1, marginRight: 12 }]}
                  onPress={() => {
                    setSelectedPromptIndex(index);
                    setShowPromptPicker(true);
                  }}
                >
                  <Text style={styles.pickerText} numberOfLines={1}>
                    {promptAnswer.question}
                  </Text>
                </TouchableOpacity>
                {promptAnswers.length > 1 && (
                  <TouchableOpacity onPress={() => removePrompt(index)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={[styles.input, styles.promptAnswer]}
                placeholder="Your answer..."
                value={promptAnswer.answer}
                onChangeText={(text) => updatePromptAnswer(index, text)}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          ))}

          {/* Prompt Picker Modal */}
          <Modal
            visible={showPromptPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowPromptPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Prompt</Text>
                <ScrollView style={styles.modalScrollView}>
                  {AVAILABLE_PROMPTS.map((prompt) => {
                    const isUsed = promptAnswers.some((pa) => pa.promptId === prompt.id && selectedPromptIndex !== null && promptAnswers[selectedPromptIndex!]?.promptId !== prompt.id);
                    return (
                      <TouchableOpacity
                        key={prompt.id}
                        style={[
                          styles.modalOption,
                          isUsed && styles.modalOptionDisabled,
                        ]}
                        onPress={() => {
                          if (!isUsed && selectedPromptIndex !== null) {
                            changePromptQuestion(selectedPromptIndex, prompt.id);
                            setShowPromptPicker(false);
                            setSelectedPromptIndex(null);
                          }
                        }}
                        disabled={isUsed}
                      >
                        <Text style={[styles.modalOptionText, isUsed && styles.modalOptionTextDisabled]}>
                          {prompt.question}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => {
                    setShowPromptPicker(false);
                    setSelectedPromptIndex(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {promptAnswers.length === 0 && (
            <TouchableOpacity onPress={addPrompt} style={styles.addFirstPromptButton}>
              <Text style={styles.addFirstPromptText}>+ Add Your First Prompt</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          loading={isLoading}
        />
        {(!hasValidPrompts() || Object.keys(errors).length > 0) && (
          <Text style={styles.hint}>
            Please fill in all required fields (*). Age must be between 18 and 100. Add at least one prompt.
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing['4xl'],
  },
  header: {
    marginBottom: theme.spacing['2xl'],
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  form: {
    marginBottom: theme.spacing['2xl'],
  },
  inputGroup: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.base,
    fontSize: theme.typography.fontSize.base,
    backgroundColor: theme.colors.backgroundTertiary,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  textArea: {
    minHeight: 100,
    paddingTop: theme.spacing.base,
  },
  pickerText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.base,
    color: theme.colors.text,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    padding: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalOptionSelected: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  modalOptionDisabled: {
    opacity: 0.5,
  },
  modalOptionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
  },
  modalOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  modalOptionTextDisabled: {
    color: theme.colors.textTertiary,
  },
  modalCancel: {
    marginTop: theme.spacing.base,
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
  promptsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  addButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm + 2,
  },
  addButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  promptContainer: {
    marginBottom: theme.spacing.base,
    padding: theme.spacing.base,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  promptAnswer: {
    minHeight: 60,
  },
  removeButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm + 2,
  },
  removeButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  addFirstPromptButton: {
    padding: theme.spacing.base,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundTertiary,
  },
  addFirstPromptText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: theme.spacing['3xl'],
  },
  hint: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
  },
});
