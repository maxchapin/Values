import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextInputField } from '../../components/TextInputField';
import { TagPill } from '../../components/TagPill';
import { ProfilePhotosPicker } from '../../components/ProfilePhotosPicker';
import { ProfilePromptsEditor } from '../../components/ProfilePromptsEditor';
import { LocationPicker } from '../../components/LocationPicker';
import { BirthdayPicker } from '../../components/BirthdayPicker';
import type { LocationCoordinates } from '../../types/user';
import { calculateAge, birthdayToISOString } from '../../utils/dateUtils';
import { trackScreenView, trackProfileCompleted, setUserProperties } from '../../services/analytics';
import { theme } from '../../theme';
import { useUserStore } from '../../store/userStore';
import { useForm, validators } from '../../hooks/useForm';
import { RootStackParamList } from '../../navigation/types';
import { Gender, InterestedIn, Prompt } from '../../types/user';
import { useAuth } from '../../contexts/AuthContext';
import { upsertSupabaseProfile } from '../../services/supabaseProfile';

type ProfileSetupScreenProps = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

interface ProfileFormData {
  name: string;
  hometown: string;
  job: string;
  education: string;
  bio: string;
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ navigation }) => {
  const { currentUser, createOrUpdateUser, isLoading } = useUserStore();
  const { user: authUser, refreshProfile } = useAuth();
  const hometownRef = useRef<TextInput>(null);
  const jobRef = useRef<TextInput>(null);
  const educationRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);

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
      hometown: currentUser?.hometown || '',
      job: currentUser?.job || '',
      education: currentUser?.education || '',
      bio: currentUser?.bio || '',
    },
    {
      name: [
        validators.required('First name is required'),
        validators.minLength(2, 'First name must be at least 2 characters'),
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

  // Separate state for complex fields
  const [gender, setGender] = useState<Gender>(currentUser?.gender || 'prefer-not-to-say');
  const [interestedIn, setInterestedIn] = useState<InterestedIn | null>(
    currentUser?.interestedIn ?? null
  );
  const [interestedInError, setInterestedInError] = useState<string | null>(null);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [locationCoordinates, setLocationCoordinates] = useState<LocationCoordinates | null>(
    currentUser?.locationCoordinates ?? null
  );
  const [locationLabel, setLocationLabel] = useState<string | null>(
    currentUser?.locationLabel ?? null
  );
  const [birthday, setBirthday] = useState<Date | string | null>(() => {
    if (currentUser?.birthday) return currentUser.birthday;
    return null;
  });
  const [birthdayError, setBirthdayError] = useState<string | null>(null);
  const [age, setAge] = useState<number>(() => {
    if (currentUser?.birthday) return calculateAge(currentUser.birthday);
    return currentUser?.age ?? 0;
  });
  const [photos, setPhotos] = useState<string[]>(
    Array.isArray(currentUser?.photos) ? currentUser!.photos : []
  );
  const [prompts, setPrompts] = useState<Prompt[]>(() => {
    const makeLocalId = (): string =>
      `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const mapped = (currentUser?.prompts ?? []).map((p) => ({
      id: p.id,
      question: p.question ?? '',
      answer: p.answer ?? '',
      isCustom: typeof (p as any).isCustom === 'boolean' ? (p as any).isCustom : false,
    }));
    return mapped.length > 0 ? mapped : [{ id: makeLocalId(), question: '', answer: '', isCustom: false }];
  });

  // Validation for prompts (separate from form validation)
  const getValidPrompts = (): Prompt[] => {
    const safe = Array.isArray(prompts) ? prompts : [];
    const cleaned = safe
      .map((p) => ({
        id: p.id,
        question: (p.question ?? '').trim(),
        answer: (p.answer ?? '').trim(),
        isCustom: !!p.isCustom,
      }))
      // ignore fully empty rows
      .filter((p) => p.question.length > 0 || p.answer.length > 0);

    return cleaned.filter((p) => p.question.length > 0 && p.answer.length > 0).slice(0, 3);
  };

  const hasValidPrompts = (): boolean => getValidPrompts().length >= 1;

  const onSubmit = async (formValues: ProfileFormData): Promise<void> => {
    if (!interestedIn) {
      setInterestedInError('Please select who you are interested in');
      return;
    }
    setInterestedInError(null);

    if (!locationCoordinates || typeof locationCoordinates.latitude !== 'number' || typeof locationCoordinates.longitude !== 'number') {
      setLocationError('Please set your location on the map (tap or drag the pin, or search for a place)');
      return;
    }
    setLocationError(null);

    const validPrompts = getValidPrompts();
    if (validPrompts.length < 1) {
      setPromptsError('Please add at least one prompt and answer');
      return;
    }
    setPromptsError(null);

    if (birthday == null) {
      setBirthdayError('Please select your birthday');
      return;
    }
    setBirthdayError(null);
    const ageNum = age;
    if (ageNum < 18 || ageNum > 100) {
      setBirthdayError('You must be 18 or older to use this app');
      return;
    }

    const birthdayISO =
      typeof birthday === 'string'
        ? birthday
        : birthdayToISOString(birthday instanceof Date ? birthday : new Date(birthday));

    const profileData = {
      email: currentUser?.email || '',
      name: formValues.name.trim(),
      age: ageNum,
      birthday: birthdayISO,
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

    await createOrUpdateUser(profileData);

    // Persist profile details into Supabase `profiles` table
    // so that auth.users(id) → profiles(id) stays in sync after onboarding.
    if (authUser) {
      try {
        const { currentUser: updatedUser } = useUserStore.getState();
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[ProfileSetupScreen] Upserting profile to Supabase...');
        }
        await upsertSupabaseProfile(authUser, updatedUser ?? {
          name: formValues.name.trim(),
          age: ageNum,
          birthday: birthdayISO,
          gender,
          interestedIn,
          locationCoordinates,
          locationLabel,
          hometown: profileData.hometown,
          job: profileData.job,
          education: profileData.education,
          bio: profileData.bio,
          photos,
          prompts: validPrompts,
        });
        await refreshProfile();
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[ProfileSetupScreen] Supabase profile OK + refreshProfile');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Could not save your profile to the cloud.';
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('[ProfileSetupScreen] Failed to upsert Supabase profile:', error);
        }
        Alert.alert(
          'Could not sync profile',
          `${msg}\n\nCheck your connection and try again. Your answers are saved on this device.`
        );
        return;
      }
    } else {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[ProfileSetupScreen] No AuthUser when attempting to upsert Supabase profile');
      }
      Alert.alert(
        'Not signed in',
        'Your profile was saved on this device only. Sign in and complete setup again to sync.'
      );
      return;
    }

    // Track profile completion
    trackProfileCompleted({
      age: ageNum,
      hasJob: !!profileData.job,
      hasEducation: !!profileData.education,
      promptsCount: validPrompts.length,
      photosCount: Array.isArray(photos) ? photos.length : 0,
    });

    // Set user properties for analytics
    setUserProperties({
      age: ageNum,
      gender,
      location: locationLabel ?? undefined,
      interestedIn,
      hometown: profileData.hometown,
    });

    // No explicit navigation needed — AppNavigator routes to the main app as soon as
    // isProfileComplete flips true. Values selection is optional and happens later
    // (Profile / Edit Profile / Discover), not as part of the gated onboarding flow.
  };

  return (
    <ScreenContainer
      scrollable
      keyboardAvoiding
      scrollViewProps={{ contentContainerStyle: styles.contentContainer }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Tell us about yourself to help us find your perfect match</Text>
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
          onSubmitEditing={() => hometownRef.current?.focus()}
        />

        {/* Birthday */}
        <BirthdayPicker
          label="Birthday *"
          value={birthday}
          onChange={(_, ageYears, birthdayISO) => {
            setBirthday(birthdayISO);
            setAge(ageYears);
            setBirthdayError(null);
          }}
          error={birthdayError ?? undefined}
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

        {/* Location (map pin) — used for matching and filters */}
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

        {/* Where are you from? — free text, informational only */}
        <TextInputField
          label="Where are you from? *"
          placeholder="e.g. Chicago, IL (your hometown — just for your profile)"
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
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          loading={isLoading}
        />
        {(!hasValidPrompts() || Object.keys(errors).length > 0 || !locationCoordinates) && (
          <Text style={styles.hint}>
            Please fill in all required fields (*). Set your location on the map. Select your birthday (18+). Add at least one prompt + answer.
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
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
