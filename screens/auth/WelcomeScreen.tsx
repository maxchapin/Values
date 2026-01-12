import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { trackScreenView, trackOnboardingStarted } from '../../services/analytics';
import { theme } from '../../theme';
import { RootStackParamList } from '../../navigation/types';

type WelcomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  useEffect(() => {
    trackScreenView('Welcome');
  }, []);

  const handleGetStarted = (): void => {
    trackOnboardingStarted();
    navigation.navigate('SignUp');
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Values</Text>
        <Text style={styles.subtitle}>
          Find meaningful connections based on shared values
        </Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Get Started" onPress={handleGetStarted} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing['4xl'],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.base,
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.relaxed,
    paddingHorizontal: theme.spacing.lg,
  },
  footer: {
    paddingBottom: theme.spacing['3xl'],
  },
});
