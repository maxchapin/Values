/**
 * EditProfileScreen
 * Allows users to edit their profile information and values
 * Reuses components and validation from ProfileSetupScreen
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextInputField } from '../components/TextInputField';
import { TagPill } from '../components/TagPill';
import { ProfilePhotosPicker } from '../components/ProfilePhotosPicker';
import { ProfilePromptsEditor } from '../components/ProfilePromptsEditor';
import { LocationPicker } from '../components/LocationPicker';
import type { LocationCoordinates } from '../types/user';
import { trackScreenView } from '../services/analytics';
import { theme } from '../theme';
import { useUserStore } from '../store/userStore';
import { useValuesOnboardingStore } from '../store/valuesOnboardingStore';
import { useForm, validators } from '../hooks/useForm';
import { RootStackParamList } from '../navigation/types';
import { Gender, InterestedIn, Prompt } from '../types/user';

type EditProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

interface ProfileFormData {
  name: string;
  age: string;
  hometown: string;
  job: string;
  education: string;
  bio: string;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const { currentUser, updateProfile, isLoading } = useUserStore();
  const ageRef = useRef<TextInput>(null);
  const hometownRef = useRef<TextInput>(null);
  const jobRef = useRef<TextInput>(null);
  const educationRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);

  useEffect(() => {
    trackScreenView('EditProfile');
  }, []);

  if (!currentUser) {
    // Should not happen, but handle gracefully
    navigation.goBack();
    return null;
  }

  // Form state using useForm hook - initialized with current user data
  const {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    handleSubmit,
    reset: resetForm,
  } = useForm<ProfileFormData>(
    {
      name: currentUser.name || '',
      age: currentUser.age.toString() || '',
      hometown: currentUser.hometown || '',
      job: currentUser.job || '',
      education: currentUser.education || '',
      bio: currentUser.bio || '',
    },
    {
      name: [
        validators.required('First name is required'),
        validators.minLength(2, 'First name must be at least 2 characters'),
      ],
      age: [
        validators.required('Age is required'),
        (value: string) => {
          if (!value.trim()) {
            return undefined;
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
      hometown: [
        validators.required('Where you are from is required'),
        validators.minLength(2, 'Please enter where you are from'),
      ],
      job: [],
      education: [],
      bio: [
        validators.required('Bio is required'),
        validators.minLength(10, 'Bio must be at least 10 characters'),
      ],
    }
  );

  // Separate state for complex fields - initialized from current user
  const [gender, setGender] = useState<Gender>(currentUser.gender || 'prefer-not-to-say');
  const [interestedIn, setInterestedIn] = useState<InterestedIn | null>(
    currentUser.interestedIn ?? null
  );
  const [interestedInError, setInterestedInError] = useState<string | null>(null);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [locationCoordinates, setLocationCoordinates] = useState<LocationCoordinates | null>(
    currentUser.locationCoordinates ?? null
  );
  const [locationLabel, setLocationLabel] = useState<string | null>(
    currentUser.locationLabel ?? null
  );
  const [photos, setPhotos] = useState<string[]>(
    Array.isArray(currentUser.photos) ? currentUser.photos : []
  );
  const [prompts, setPrompts] = useState<Prompt[]>(() => {
    const makeLocalId = (): string =>
      `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const mapped = (currentUser.prompts ?? []).map((p) => ({
      id: p.id,
      question: p.question ?? '',
      answer: p.answer ?? '',
      isCustom: typeof (p as any).isCustom === 'boolean' ? (p as any).isCustom : false,
    }));
    return mapped.length > 0 ? mapped : [{ id: makeLocalId(), question: '', answer: '', isCustom: false }];
  });

  // Validation for prompts
  const getValidPrompts = (): Prompt[] => {
    const safe = Array.isArray(prompts) ? prompts : [];
    const cleaned = safe
      .map((p) => ({
        id: p.id,
        question: (p.question ?? '').trim(),
        answer: (p.answer ?? '').trim(),
        isCustom: !!p.isCustom,
      }))
      .filter((p) => p.question.length > 0 || p.answer.length > 0);

    return cleaned.filter((p) => p.question.length > 0 && p.answer.length > 0).slice(0, 3);
  };

  const hasValidPrompts = (): boolean => getValidPrompts().length >= 1;

  const handleSave = async (formValues: ProfileFormData): Promise<void> => {
    // Validate interestedIn
    if (!interestedIn) {
      setInterestedInError('Please select who you are interested in');
      return;
    }
    setInterestedInError(null);

    // Require location
    if (!locationCoordinates || typeof locationCoordinates.latitude !== 'number' || typeof locationCoordinates.longitude !== 'number') {
      setLocationError('Please set your location on the map');
      return;
    }
    setLocationError(null);

    // Validate prompts
    const validPrompts = getValidPrompts();
    if (validPrompts.length < 1) {
      setPromptsError('Please add at least one prompt and answer');
      return;
    }
    setPromptsError(null);

    const ageNum = parseInt(formValues.age, 10);

    const profileData = {
      name: formValues.name.trim(),
      age: ageNum,
      gender,
      interestedIn,
      locationCoordinates,
      locationLabel,
      hometown: formValues.hometown.trim(),
      job: formValues.job.trim() || undefined,
      education: formValues.education.trim() || undefined,
      bio: formValues.bio.trim(),
      photos,
      prompts: validPrompts,
    };

    await updateProfile(profileData);
    
    // Navigate back to Profile screen
    navigation.goBack();
  };

  const handleCancel = (): void => {
    // Discard changes and go back
    navigation.goBack();
  };

  const handleEditValues = (): void => {
    // Initialize values store with current user's values profile
    if (currentUser.valuesProfile) {
      useValuesOnboardingStore.getState().initializeFromProfile(currentUser.valuesProfile);
    }
    
    // Navigate to values onboarding flow with edit mode flag
    navigation.navigate('ValuesOnboarding', { fromEditProfile: true });
  };

  // Get top 5 values for display
  const top5Values = currentUser.valuesProfile?.top5Ids
    .map((id) => {
      const value = currentUser.valuesProfile?.allValues.find((v) => v.id === id);
      return value?.label || id;
    })
    .filter(Boolean) || [];

  return (
    <ScreenContainer
      scrollable
      keyboardAvoiding
      scrollViewProps={{ contentContainerStyle: styles.contentContainer }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Edit Profile</Text>
        <Text style={styles.subtitle}>Update your profile information</Text>
      </View>

      <View style={styles.form}>
        {/* Photos */}
        <ProfilePhotosPicker photos={photos} onChange={setPhotos} />

        {/* First Name */}
        <TextInputField
          label="First Name *"
          placeholder="Enter your first name"
          value={values.name}
          onChangeText={(text) => {
            setValue('name', text, true);
          }}
          onBlur={() => setFieldTouched('name')}
          error={touched.name ? errors.name : undefined}
          autoCapitalize="words"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => ageRef.current?.focus()}
        />

        {/* Age */}
        <TextInputField
          ref={ageRef}
          label="Age *"
          placeholder="Enter your age"
          value={values.age}
          onChangeText={(text) => {
            setValue('age', text, true);
          }}
          onBlur={() => setFieldTouched('age')}
          error={touched.age ? errors.age : undefined}
          keyboardType="number-pad"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => hometownRef.current?.focus()}
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

        {/* Interested In */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>I am interested in *</Text>
          <View style={styles.pillRow}>
            <TagPill
              label="Men"
              selected={interestedIn === 'men'}
              onPress={() => {
                setInterestedIn('men');
                setInterestedInError(null);
              }}
            />
            <TagPill
              label="Women"
              selected={interestedIn === 'women'}
              onPress={() => {
                setInterestedIn('women');
                setInterestedInError(null);
              }}
              style={{ marginLeft: theme.spacing.sm }}
            />
            <TagPill
              label="Everyone"
              selected={interestedIn === 'everyone'}
              onPress={() => {
                setInterestedIn('everyone');
                setInterestedInError(null);
              }}
              style={{ marginLeft: theme.spacing.sm }}
            />
          </View>
          {interestedInError && <Text style={styles.errorText}>{interestedInError}</Text>}
        </View>

        {/* Location */}
        <LocationPicker
          coordinates={locationCoordinates}
          locationLabel={locationLabel}
          onChange={(coords, label) => {
            setLocationCoordinates(coords);
            setLocationLabel(label);
            setLocationError(null);
          }}
          error={locationError ?? undefined}
          mapHeight={240}
          searchPlaceholder="Search for a city or address..."
        />

        {/* Where are you from? */}
        <TextInputField
          label="Where are you from? *"
          placeholder="e.g. Chicago, IL"
          value={values.hometown}
          onChangeText={(text) => {
            setValue('hometown', text, true);
          }}
          onBlur={() => setFieldTouched('hometown')}
          error={touched.hometown ? errors.hometown : undefined}
          autoCapitalize="words"
          ref={hometownRef}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => jobRef.current?.focus()}
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
          ref={jobRef}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => educationRef.current?.focus()}
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
          ref={educationRef}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => bioRef.current?.focus()}
        />

        {/* Bio */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio *</Text>
          <TextInput
            ref={bioRef}
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
            returnKeyType="done"
          />
          {touched.bio && errors.bio && (
            <Text style={styles.errorText}>{errors.bio}</Text>
          )}
        </View>

        {/* Prompts */}
        <ProfilePromptsEditor
          prompts={prompts}
          onChange={setPrompts}
          error={promptsError}
        />

        {/* Edit Values Section */}
        <View style={styles.valuesSection}>
          <Text style={styles.sectionTitle}>Your Values</Text>
          {top5Values.length > 0 ? (
            <View style={styles.top5Container}>
              <Text style={styles.top5Label}>Core 5 Values:</Text>
              <View style={styles.top5Values}>
                {top5Values.map((label, index) => (
                  <View key={index} style={styles.top5Value}>
                    <Text style={styles.top5ValueText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.noValuesText}>No values selected</Text>
          )}
          <PrimaryButton
            title="Edit Values"
            onPress={handleEditValues}
            style={styles.editValuesButton}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <SecondaryButton
            title="Cancel"
            onPress={handleCancel}
            style={styles.cancelButton}
          />
          <PrimaryButton
            title="Save"
            onPress={handleSubmit(handleSave)}
            disabled={isLoading}
            loading={isLoading}
            style={styles.saveButton}
          />
        </View>
        {(!hasValidPrompts() || Object.keys(errors).length > 0 || !locationCoordinates) && (
          <Text style={styles.hint}>
            Please fill in all required fields (*). Set your location on the map. Age 18–100. Add at least one prompt + answer.
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: theme.spacing['2xl'],
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.base,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    minHeight: 48,
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  modalOption: {
    padding: theme.spacing.base,
    borderRadius: theme.borderRadius.base,
    marginBottom: theme.spacing.sm,
  },
  modalOptionSelected: {
    backgroundColor: theme.colors.primaryLight,
  },
  modalOptionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
  },
  modalOptionTextSelected: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  modalCancel: {
    marginTop: theme.spacing.base,
    padding: theme.spacing.base,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  valuesSection: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  top5Container: {
    marginBottom: theme.spacing.md,
  },
  top5Label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  top5Values: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  top5Value: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  top5ValueText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textInverse,
    fontWeight: theme.typography.fontWeight.medium,
  },
  noValuesText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
  },
  editValuesButton: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  saveButton: {
    flex: 1,
  },
  hint: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});
