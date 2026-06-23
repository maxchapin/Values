import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { theme } from '../theme';

const STORAGE_KEY = '@values/policy_accepted_version';

function legalUrl(key: 'privacyPolicyUrl' | 'termsOfServiceUrl'): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const v = extra?.[key];
  return typeof v === 'string' && v.startsWith('http') ? v : undefined;
}

/**
 * Blocks main app until the user acknowledges the current policy version (stored in `extra.policyVersion`).
 */
export const PolicyAcceptanceGate: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const policyVersion = typeof extra?.policyVersion === 'string' ? extra.policyVersion : '1';

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const accepted = await AsyncStorage.getItem(STORAGE_KEY);
        if (!alive) return;
        if (accepted !== policyVersion) setVisible(true);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [policyVersion]);

  const openPrivacy = useCallback(async () => {
    const url = legalUrl('privacyPolicyUrl');
    if (url) await Linking.openURL(url);
    else Alert.alert('Privacy Policy', 'Configure privacyPolicyUrl in app config.');
  }, []);

  const openTerms = useCallback(async () => {
    const url = legalUrl('termsOfServiceUrl');
    if (url) await Linking.openURL(url);
    else Alert.alert('Terms of Service', 'Configure termsOfServiceUrl in app config.');
  }, []);

  const accept = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, policyVersion);
    setVisible(false);
  }, [policyVersion]);

  if (!ready || !visible) return null;

  return (
    <Modal visible animationType="fade" presentationStyle="pageSheet">
      <View style={styles.wrap}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.body}>
          The Local is for adults 18+. By continuing, you agree to our Terms of Service and acknowledge our Privacy
          Policy.
        </Text>
        <Pressable style={styles.linkBtn} onPress={() => void openPrivacy()}>
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => void openTerms()}>
          <Text style={styles.linkText}>Terms of Service</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={() => void accept()}>
          <Text style={styles.primaryBtnText}>I agree</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: theme.spacing.xl,
    paddingTop: 56,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  body: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  linkBtn: {
    paddingVertical: theme.spacing.sm,
  },
  linkText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  primaryBtn: {
    marginTop: theme.spacing['2xl'],
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
