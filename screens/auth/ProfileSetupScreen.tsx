import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useUserStore } from '../../store/userStore';
import { RootStackParamList } from '../../navigation/types';
import { Gender, Prompt } from '../../types/user';
import { AVAILABLE_PROMPTS } from '../../constants/prompts';

type ProfileSetupScreenProps = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

interface PromptAnswer {
  promptId: string;
  question: string;
  answer: string;
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ navigation }) => {
  const { currentUser, createOrUpdateUser, isLoading } = useUserStore();

  // Form state
  const [name, setName] = useState(currentUser?.name || '');
  const [age, setAge] = useState(currentUser?.age.toString() || '');
  const [gender, setGender] = useState<Gender>(currentUser?.gender || 'prefer-not-to-say');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
  const [location, setLocation] = useState(currentUser?.location || '');
  const [job, setJob] = useState(currentUser?.job || '');
  const [education, setEducation] = useState(currentUser?.education || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
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

  // Validation
  const isValid = (): boolean => {
    const ageNum = parseInt(age, 10);
    const hasValidAge = ageNum >= 18 && ageNum <= 100;
    const hasRequiredFields = name.trim().length > 0 && location.trim().length > 0 && bio.trim().length > 0;
    const hasAtLeastOnePrompt = promptAnswers.length >= 1 && promptAnswers.every((pa) => pa.answer.trim().length > 0);

    return hasValidAge && hasRequiredFields && hasAtLeastOnePrompt;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!isValid()) return;

    const ageNum = parseInt(age, 10);
    const prompts: Prompt[] = promptAnswers.map((pa) => ({
      id: pa.promptId,
      question: pa.question,
      answer: pa.answer.trim(),
    }));

    const profileData = {
      email: currentUser?.email || '',
      name: name.trim(),
      age: ageNum,
      gender,
      location: location.trim(),
      job: job.trim() || undefined,
      education: education.trim() || undefined,
      bio: bio.trim(),
      prompts,
    };

    await createOrUpdateUser(profileData);

    // Navigate to values selection flow
    navigation.navigate('ValuesSelection');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Tell us about yourself to help us find your perfect match</Text>
      </View>

      <View style={styles.form}>
        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Age */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your age"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />
          {age && (parseInt(age, 10) < 18 || parseInt(age, 10) > 100) && (
            <Text style={styles.errorText}>Age must be between 18 and 100</Text>
          )}
        </View>

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
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="City, State"
            value={location}
            onChangeText={setLocation}
            autoCapitalize="words"
          />
        </View>

        {/* Job */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Job</Text>
          <TextInput
            style={styles.input}
            placeholder="What do you do?"
            value={job}
            onChangeText={setJob}
            autoCapitalize="words"
          />
        </View>

        {/* Education */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Education</Text>
          <TextInput
            style={styles.input}
            placeholder="Your education level or degree"
            value={education}
            onChangeText={setEducation}
            autoCapitalize="words"
          />
        </View>

        {/* Bio */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
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
          onPress={handleSubmit}
          disabled={!isValid() || isLoading}
          loading={isLoading}
        />
        {!isValid() && (
          <Text style={styles.hint}>
            Please fill in all required fields (*). Age must be between 18 and 100. Add at least one prompt.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  modalOptionDisabled: {
    opacity: 0.5,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modalOptionTextDisabled: {
    color: '#999',
  },
  modalCancel: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  promptsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  promptContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  promptAnswer: {
    minHeight: 60,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff3b30',
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addFirstPromptButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  addFirstPromptText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 40,
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#ff3b30',
  },
});
