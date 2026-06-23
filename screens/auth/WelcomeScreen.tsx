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
        <View style={styles.logoMark}>
          <Text style={styles.logoLetter}>L</Text>
        </View>
        <Text style={styles.title}>Welcome to The Local</Text>
        <Text style={styles.subtitle}>
          Find meaningful connections based on shared values — not photos.
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
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.lg,
  },
  logoLetter: {
    fontSize: 44,
    fontWeight: '800',
    color: theme.colors.textInverse,
    letterSpacing: -1,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    paddingHorizontal: theme.spacing.xl,
    maxWidth: 300,
  },
  footer: {
    paddingBottom: theme.spacing['2xl'],
  },
});
