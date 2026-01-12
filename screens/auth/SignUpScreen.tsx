import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
    const user = await createUser({
      email: formValues.email.trim(),
      name: formValues.name.trim(),
      age: 25, // Default, will be updated in profile setup
      location: '',
      bio: '',
      photos: [],
      selectedValues: [],
    });

    trackSignUp({ method: 'email' });
    if (user?.id) {
      setUserId(user.id);
    }

    navigation.navigate('ProfileSetup');
  };

  return (
    <ScreenContainer scrollable scrollViewProps={{ contentContainerStyle: styles.contentContainer }}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Let's get started with your profile</Text>
      </View>

      <View style={styles.form}>
        <TextInputField
          label="Name"
          placeholder="Enter your name"
          value={values.name}
          onChangeText={(text) => {
            setValue('name', text, true);
          }}
          onBlur={() => setFieldTouched('name')}
          error={touched.name ? errors.name : undefined}
          autoCapitalize="words"
        />

        <TextInputField
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
        />
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
  footer: {
    marginTop: 'auto',
    paddingBottom: theme.spacing['3xl'],
  },
});
