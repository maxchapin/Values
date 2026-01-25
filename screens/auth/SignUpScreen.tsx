import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Switch, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextInputField } from '../../components/TextInputField';
import { trackScreenView, trackSignUp, setUserId } from '../../services/analytics';
import { theme } from '../../theme';
import { useUserStore } from '../../store/userStore';
import { useForm, validators } from '../../hooks/useForm';
import { RootStackParamList } from '../../navigation/types';

type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

interface SignUpFormData {
  email: string;
  name: string;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const { createUser, isLoading } = useUserStore();
  const [keepSignedIn, setKeepSignedIn] = useState<boolean>(true);
  const emailRef = useRef<TextInput>(null);

  useEffect(() => {
    trackScreenView('SignUp');
  }, []);

  const {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    handleSubmit,
  } = useForm<SignUpFormData>(
    {
      email: '',
      name: '',
    },
    {
      email: [
        validators.required('Email is required'),
        validators.email('Please enter a valid email address'),
      ],
      name: [
        validators.required('Name is required'),
        validators.minLength(2, 'Name must be at least 2 characters'),
      ],
    }
  );

  const onSubmit = async (formValues: SignUpFormData): Promise<void> => {
    if (__DEV__) {
      console.log('[SignUpScreen] Submitting form with keepSignedIn:', keepSignedIn);
    }
    
    await createUser(
      {
        email: formValues.email.trim(),
        name: formValues.name.trim(),
        age: 25, // Default, will be updated in profile setup
        gender: 'prefer-not-to-say', // Default, will be updated in profile setup
        location: '',
        bio: '',
        photos: [],
        prompts: [], // Will be updated in profile setup
        selectedValues: [],
      },
      keepSignedIn
    );
    
    if (__DEV__) {
      const { keepSignedIn: storeKeepSignedIn } = useUserStore.getState();
      console.log('[SignUpScreen] After createUser, store keepSignedIn:', storeKeepSignedIn);
    }

    const { currentUser } = useUserStore.getState();
    trackSignUp({ method: 'email' });
    if (currentUser?.id) {
      setUserId(currentUser.id);
    }

    navigation.navigate('ProfileSetup');
  };

  return (
    <ScreenContainer
      scrollable
      keyboardAvoiding
      scrollViewProps={{ contentContainerStyle: styles.contentContainer }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Let's get started with your profile</Text>
      </View>

      <View style={styles.form}>
        <TextInputField
          label="First Name"
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
          onSubmitEditing={() => emailRef.current?.focus()}
        />

        <TextInputField
          ref={emailRef}
          label="Email"
          placeholder="Enter your email"
          value={values.email}
          onChangeText={(text) => {
            setValue('email', text, true);
          }}
          onBlur={() => setFieldTouched('email')}
          error={touched.email ? errors.email : undefined}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSubmit(onSubmit)}
        />
      </View>

      <View style={styles.keepSignedInContainer}>
        <Switch
          value={keepSignedIn}
          onValueChange={setKeepSignedIn}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={theme.colors.background}
        />
        <View style={styles.keepSignedInText}>
          <Text style={styles.keepSignedInLabel}>Keep me signed in</Text>
          <Text style={styles.keepSignedInHint}>Stay signed in on this device until you log out</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          loading={isLoading}
        />
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
  keepSignedInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
  },
  keepSignedInLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  keepSignedInText: {
    flex: 1,
  },
  keepSignedInHint: {
    marginLeft: theme.spacing.md,
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: theme.spacing['3xl'],
  },
});
