/**
 * EditProfileScreen
 * Edit profile with generous spacing, optional location (neighborhood), optional hometown/bio.
 * Unsaved changes: `usePreventRemove` (native-stack–safe) intercepts exit and shows one alert.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, usePreventRemove, type NavigationAction } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextInputField } from '../components/TextInputField';
import { ProfilePhotosPicker } from '../components/ProfilePhotosPicker';
import { ProfilePromptsEditor } from '../components/ProfilePromptsEditor';
import { trackScreenView } from '../services/analytics';
import { theme } from '../theme';
import { useUserStore } from '../store/userStore';
import { useAuth } from '../contexts/AuthContext';
import { useValuesOnboardingStore } from '../store/valuesOnboardingStore';
import { useForm, validators } from '../hooks/useForm';
import { RootStackParamList } from '../navigation/types';
import { Gender, InterestedIn, Prompt } from '../types/user';
import { upsertSupabaseProfile } from '../services/supabaseProfile';
import { LocationPicker, type LocationCoordinates } from '../components/LocationPicker';
import { BirthdayPicker } from '../components/BirthdayPicker';
import { calculateAge, birthdayToISOString } from '../utils/dateUtils';

type EditProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const EDIT_AREA_PADDING = 28;

interface ProfileFormData {
  name: string;
  neighborhood: string;
  hometown: string;
  job: string;
  education: string;
  bio: string;
}

function getFormSnapshot(
  values: ProfileFormData,
  opts: { gender: Gender; interestedIn: InterestedIn | null; photos: string[]; prompts: Prompt[]; locationCoordinates: LocationCoordinates | null; birthday: string | null; age: number }
): string {
  return JSON.stringify({
    ...values,
    ...opts,
  });
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { currentUser, updateProfile } = useUserStore();
  const { user: authUser, refreshProfile } = useAuth();
  const neighborhoodRef = useRef<TextInput>(null);
  const hometownRef = useRef<TextInput>(null);
  const jobRef = useRef<TextInput>(null);
  const educationRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const originalSnapshotRef = useRef<string>('');
  /** Navigation action from the blocked removal; replayed after discard or successful save. */
  const pendingExitActionRef = useRef<NavigationAction | null>(null);
  /** False until `useFocusEffect` has synced baseline from `currentUser` (avoids false dirty on first paint). */
  const [hasBaseline, setHasBaseline] = useState(false);
  /**
   * When true, `usePreventRemove` is off so the next `dispatch` / `goBack` succeeds.
   * State (not ref) so native-stack receives an updated `preventRemove` flag before we replay the action.
   */
  const [exitWithoutGuard, setExitWithoutGuard] = useState(false);
  const [locationCoordinates, setLocationCoordinates] = useState<LocationCoordinates | null>(
    currentUser?.locationCoordinates ?? null
  );

  useEffect(() => {
    trackScreenView('EditProfile');
  }, []);

  const initialFormValues: ProfileFormData = {
    name: currentUser?.name ?? '',
    neighborhood: currentUser?.neighborhood ?? '',
    hometown: currentUser?.hometown ?? '',
    job: currentUser?.job ?? '',
    education: currentUser?.education ?? '',
    bio: currentUser?.bio ?? '',
  };

  const {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
  } = useForm<ProfileFormData>(
    initialFormValues,
    {
      name: [
        validators.required('First name is required'),
        validators.minLength(2, 'First name must be at least 2 characters'),
      ],
      neighborhood: [],
      hometown: [],
      job: [],
      education: [],
      bio: [
        (v: string) => {
          const t = (v ?? '').trim();
          if (t.length === 0) return undefined;
          if (t.length < 10) return 'Bio must be 10+ characters';
          return undefined;
        },
      ],
    }
  );

  const [gender, setGender] = useState<Gender>(currentUser?.gender ?? 'prefer-not-to-say');
  const [interestedIn, setInterestedIn] = useState<InterestedIn | null>(currentUser?.interestedIn ?? null);
  const [interestedInError, setInterestedInError] = useState<string | null>(null);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showInterestedInPicker, setShowInterestedInPicker] = useState(false);
  const [birthday, setBirthday] = useState<Date | string | null>(() => currentUser?.birthday ?? null);
  const [birthdayError, setBirthdayError] = useState<string | null>(null);
  const [age, setAge] = useState<number>(() => {
    if (currentUser?.birthday) return calculateAge(currentUser.birthday);
    return currentUser?.age ?? 0;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>(Array.isArray(currentUser?.photos) ? currentUser.photos : []);
  const [prompts, setPrompts] = useState<Prompt[]>(() => {
    const makeId = () => `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const raw = currentUser?.prompts ?? [];
    const mapped = raw.map((p) => ({
      id: p.id,
      question: p.question ?? '',
      answer: p.answer ?? '',
      isCustom: typeof (p as { isCustom?: boolean }).isCustom === 'boolean' ? (p as { isCustom: boolean }).isCustom : false,
    }));
    return mapped.length > 0 ? mapped : [{ id: makeId(), question: '', answer: '', isCustom: false }];
  });

  useFocusEffect(
    useCallback(() => {
      setExitWithoutGuard(false);
      const user = useUserStore.getState().currentUser;
      if (!user) return;
      setValue('name', user.name ?? '', false);
      setBirthday(user.birthday ?? null);
      setAge(user.birthday ? calculateAge(user.birthday) : (user.age ?? 0));
      setValue('neighborhood', user.neighborhood ?? '', false);
      setValue('hometown', user.hometown ?? '', false);
      setValue('job', user.job ?? '', false);
      setValue('education', user.education ?? '', false);
      setValue('bio', user.bio ?? '', false);
      setGender(user.gender ?? 'prefer-not-to-say');
      setInterestedIn(user.interestedIn ?? null);
      setPhotos(Array.isArray(user.photos) ? user.photos : []);
      const raw = user.prompts ?? [];
      const mapped = raw.map((p) => ({
        id: p.id,
        question: p.question ?? '',
        answer: p.answer ?? '',
        isCustom: typeof (p as { isCustom?: boolean }).isCustom === 'boolean' ? (p as { isCustom: boolean }).isCustom : false,
      }));
      setPrompts(mapped.length > 0 ? mapped : [{ id: `prompt-${Date.now()}`, question: '', answer: '', isCustom: false }]);
      setLocationCoordinates(user.locationCoordinates ?? null);
      originalSnapshotRef.current = getFormSnapshot(
        {
          name: user.name ?? '',
          neighborhood: user.neighborhood ?? '',
          hometown: user.hometown ?? '',
          job: user.job ?? '',
          education: user.education ?? '',
          bio: user.bio ?? '',
        },
        {
          gender: user.gender ?? 'prefer-not-to-say',
          interestedIn: user.interestedIn ?? null,
          photos: Array.isArray(user.photos) ? user.photos : [],
          prompts: mapped.length > 0 ? mapped : [],
          locationCoordinates: user.locationCoordinates ?? null,
          birthday: user.birthday ?? null,
          age: user.birthday ? calculateAge(user.birthday) : (user.age ?? 0),
        }
      );
      setHasBaseline(true);
    }, [setValue])
  );

  const currentSnapshot = getFormSnapshot(values, { gender, interestedIn, photos, prompts, locationCoordinates, birthday, age });
  const isDirty = hasBaseline && originalSnapshotRef.current !== currentSnapshot;

  const getValidPrompts = (): Prompt[] => {
    const safe = Array.isArray(prompts) ? prompts : [];
    const cleaned = safe
      .map((p) => ({
        id: p.id,
        question: (p.question ?? '').trim(),
        answer: (p.answer ?? '').trim(),
        isCustom: !!p.isCustom,
      }))
      .filter((p) => p.question.length > 0 && p.answer.length > 0);
    return cleaned.slice(0, 3);
  };

  /** Complete a blocked exit: lift native guard, then replay the pending action (or `goBack`). */
  const completePendingExit = useCallback(() => {
    setExitWithoutGuard(true);
    const action = pendingExitActionRef.current;
    pendingExitActionRef.current = null;
    // Defer past React commit + native-stack updating `preventNativeDismiss`
    setTimeout(() => {
      if (action) {
        navigation.dispatch(action);
      } else {
        navigation.goBack();
      }
    }, 0);
  }, [navigation]);

  const handleSave = useCallback(
    async (formValues: ProfileFormData): Promise<boolean> => {
      if (!currentUser) return false;
      if (!interestedIn) {
        setInterestedInError('Please select who you are interested in');
        return false;
      }
      setInterestedInError(null);
      const validPrompts = getValidPrompts();
      if (validPrompts.length < 1) {
        setPromptsError('Please add at least one prompt and answer');
        return false;
      }
      setPromptsError(null);

      if (birthday == null) {
        setBirthdayError('Please select your birthday');
        return false;
      }
      setBirthdayError(null);
      if (age < 18 || age > 100) {
        setBirthdayError('You must be 18 or older');
        return false;
      }
      const birthdayISO =
        typeof birthday === 'string'
          ? birthday
          : birthdayToISOString(birthday instanceof Date ? birthday : new Date(birthday));

      const profileData = {
        name: formValues.name.trim(),
        age,
        birthday: birthdayISO,
        gender,
        interestedIn,
        locationCoordinates: locationCoordinates ?? undefined,
        locationLabel: formValues.neighborhood.trim() || null,
        neighborhood: formValues.neighborhood.trim() || null,
        hometown: formValues.hometown.trim() || undefined,
        job: formValues.job.trim() || undefined,
        education: formValues.education.trim() || undefined,
        bio: formValues.bio.trim() || '',
        photos,
        prompts: validPrompts,
      };

      setIsSaving(true);
      try {
        await updateProfile(profileData);
        const updatedUser = useUserStore.getState().currentUser;
        if (authUser && updatedUser) {
          try {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log('[EditProfileScreen] Upserting profile to Supabase...');
            }
            await upsertSupabaseProfile(authUser, updatedUser);
            await refreshProfile();
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log('[EditProfileScreen] Profile synced + refreshProfile OK');
            }
          } catch (supabaseErr) {
            const msg = supabaseErr instanceof Error ? supabaseErr.message : 'Unknown error';
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.error('[EditProfileScreen] Supabase upsert failed:', supabaseErr);
            }
            Alert.alert(
              'Saved locally',
              `Your changes are on this device, but sync failed: ${msg}`
            );
          }
        }
        completePendingExit();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save profile';
        Alert.alert('Error', message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [
      currentUser,
      interestedIn,
      birthday,
      age,
      gender,
      locationCoordinates,
      photos,
      prompts,
      authUser,
      updateProfile,
      completePendingExit,
      refreshProfile,
    ]
  );

  /**
   * Single save entry used by the Save button and "Save and exit" in the unsaved-changes dialog.
   * Runs the same validation as the form submit path, then `handleSave`.
   */
  const submitProfile = useCallback(async (): Promise<boolean> => {
    if (!validateAll()) {
      Alert.alert('Cannot save', 'Please fix the errors in the form.');
      return false;
    }
    return handleSave(values);
  }, [validateAll, values, handleSave]);

  const showUnsavedChangesAlert = useCallback(() => {
    Alert.alert('Unsaved changes', 'You have unsaved changes. What would you like to do?', [
      {
        text: 'Continue without saving',
        style: 'destructive',
        onPress: () => {
          completePendingExit();
        },
      },
      {
        text: 'Save and exit',
        onPress: () => {
          void submitProfile();
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {
          pendingExitActionRef.current = null;
        },
      },
    ]);
  }, [completePendingExit, submitProfile]);

  usePreventRemove(
    hasBaseline && isDirty && !exitWithoutGuard,
    useCallback(
      ({ data }) => {
        pendingExitActionRef.current = data.action;
        showUnsavedChangesAlert();
      },
      [showUnsavedChangesAlert]
    )
  );

  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: 'Profile',
      headerBackButtonMenuEnabled: false,
    });
  }, [navigation]);

  const onSavePress = useCallback(() => {
    void submitProfile();
  }, [submitProfile]);

  /** Same exit path as the header back: `goBack` → `usePreventRemove` when dirty. */
  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEditValues = (): void => {
    if (currentUser?.valuesProfile) {
      useValuesOnboardingStore.getState().initializeFromProfile(currentUser.valuesProfile);
    }
    navigation.navigate('ValuesOnboarding', { fromEditProfile: true });
  };

  if (!currentUser) {
    navigation.goBack();
    return null;
  }

  const top5Values =
    currentUser.valuesProfile?.top5Ids
      ?.map((id) => currentUser.valuesProfile!.allValues.find((v) => v.id === id)?.label || id)
      .filter(Boolean) ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.editArea}>
            <View style={styles.header}>
              <Text style={styles.title}>Edit Profile</Text>
              <Text style={styles.subtitle}>Update your profile information</Text>
            </View>

            <View style={styles.form}>
          <ProfilePhotosPicker photos={photos} onChange={setPhotos} />

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
            <PrimaryButton title="Edit Values" onPress={handleEditValues} style={styles.editValuesButton} />
          </View>

          <TextInputField
            label="First Name *"
            placeholder="Enter your first name"
            value={values.name}
            onChangeText={(t) => setValue('name', t, true)}
            onBlur={() => setFieldTouched('name')}
            error={touched.name ? errors.name : undefined}
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => neighborhoodRef.current?.focus()}
          />

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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowGenderPicker(true)}>
              <Text style={styles.pickerText}>
                {gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : gender === 'non-binary' ? 'Non-binary' : 'Prefer not to say'}
              </Text>
            </TouchableOpacity>
            <Modal visible={showGenderPicker} transparent animationType="slide" onRequestClose={() => setShowGenderPicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Gender</Text>
                  {(['male', 'female', 'non-binary', 'prefer-not-to-say'] as Gender[]).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.modalOption, gender === g && styles.modalOptionSelected]}
                      onPress={() => { setGender(g); setShowGenderPicker(false); }}
                    >
                      <Text style={[styles.modalOptionText, gender === g && styles.modalOptionTextSelected]}>
                        {g === 'male' ? 'Male' : g === 'female' ? 'Female' : g === 'non-binary' ? 'Non-binary' : 'Prefer not to say'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setShowGenderPicker(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>I am interested in *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowInterestedInPicker(true)}>
              <Text style={styles.pickerText}>
                {interestedIn === 'men' ? 'Men' : interestedIn === 'women' ? 'Women' : interestedIn === 'everyone' ? 'Everyone' : 'Select...'}
              </Text>
            </TouchableOpacity>
            <Modal visible={showInterestedInPicker} transparent animationType="slide" onRequestClose={() => setShowInterestedInPicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>I am interested in</Text>
                  {(['men', 'women', 'everyone'] as InterestedIn[]).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.modalOption, interestedIn === opt && styles.modalOptionSelected]}
                      onPress={() => {
                        setInterestedIn(opt);
                        setInterestedInError(null);
                        setShowInterestedInPicker(false);
                      }}
                    >
                      <Text style={[styles.modalOptionText, interestedIn === opt && styles.modalOptionTextSelected]}>
                        {opt === 'men' ? 'Men' : opt === 'women' ? 'Women' : 'Everyone'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setShowInterestedInPicker(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            {interestedInError ? <Text style={styles.errorText}>{interestedInError}</Text> : null}
          </View>

          <LocationPicker
            coordinates={locationCoordinates}
            locationLabel={values.neighborhood || null}
            onChange={(coords, label) => {
              setLocationCoordinates(coords);
              setValue('neighborhood', label ?? '', true);
            }}
            searchPlaceholder="Search for a neighborhood or address..."
            mapHeight={220}
          />

          <TextInputField
            ref={neighborhoodRef}
            label="Neighborhood"
            placeholder="e.g. Harvard Square, Central Square (or pick on map above)"
            value={values.neighborhood}
            onChangeText={(t) => setValue('neighborhood', t, true)}
            onBlur={() => setFieldTouched('neighborhood')}
            error={touched.neighborhood ? errors.neighborhood : undefined}
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => hometownRef.current?.focus()}
          />

          <TextInputField
            ref={hometownRef}
            label="Where are you from?"
            placeholder="e.g. Chicago, IL"
            value={values.hometown}
            onChangeText={(t) => setValue('hometown', t, true)}
            onBlur={() => setFieldTouched('hometown')}
            error={touched.hometown ? errors.hometown : undefined}
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => jobRef.current?.focus()}
          />

          <TextInputField
            ref={jobRef}
            label="Job"
            placeholder="What do you do?"
            value={values.job}
            onChangeText={(t) => setValue('job', t, true)}
            onBlur={() => setFieldTouched('job')}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => educationRef.current?.focus()}
          />

          <TextInputField
            ref={educationRef}
            label="Education"
            placeholder="Your education level or degree"
            value={values.education}
            onChangeText={(t) => setValue('education', t, true)}
            onBlur={() => setFieldTouched('education')}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => bioRef.current?.focus()}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              ref={bioRef}
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about yourself... (min 10 characters)"
              value={values.bio}
              onChangeText={(t) => setValue('bio', t, true)}
              onBlur={() => setFieldTouched('bio')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={theme.colors.textTertiary}
              returnKeyType="done"
            />
            {touched.bio && errors.bio ? (
              <Text style={styles.errorText}>{errors.bio}</Text>
            ) : null}
          </View>

          <ProfilePromptsEditor prompts={prompts} onChange={setPrompts} error={promptsError} />
        </View>
        </View>
        </ScrollView>

        <View style={[styles.fixedButtonBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
          <TouchableOpacity
            style={styles.cancelButtonFixed}
            onPress={handleCancel}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonFixedText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButtonFixed,
              (!isDirty || isSaving || !!errors.bio || (values.bio.trim().length > 0 && values.bio.trim().length < 10)) &&
                styles.saveButtonDisabled,
            ]}
            disabled={
              !isDirty ||
              isSaving ||
              !!errors.bio ||
              (values.bio.trim().length > 0 && values.bio.trim().length < 10)
            }
            onPress={onSavePress}
          >
            <Text style={styles.saveButtonFixedText}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const FIXED_BAR_HEIGHT = 88;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: EDIT_AREA_PADDING,
    paddingBottom: FIXED_BAR_HEIGHT,
  },
  editArea: {
    paddingTop: theme.spacing.md,
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
  top5Container: { marginBottom: theme.spacing.md },
  top5Label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  top5Values: { flexDirection: 'row', flexWrap: 'wrap' },
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
  editValuesButton: { marginTop: theme.spacing.sm },
  fixedButtonBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: EDIT_AREA_PADDING,
    paddingVertical: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  cancelButtonFixed: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  cancelButtonFixedText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  saveButtonFixed: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
    opacity: 0.7,
  },
  saveButtonFixedText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
});
