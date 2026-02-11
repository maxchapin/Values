/**
 * App entry point. Loads App via dynamic import so that any top-level errors
 * (e.g. missing EXPO_PUBLIC_* in EAS builds) are caught and shown instead of a white screen.
 */
import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

function Root(): React.ReactElement {
  const [App, setApp] = useState<React.ComponentType | null>(null);
  const [err, setErr] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('./App')
      .then((m) => {
        if (!cancelled) setApp(() => m.default);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const error = e instanceof Error ? e : new Error(String(e));
          setErr(error);
          console.error('[Root] App load failed:', error.message, error.stack);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>{err.message}</Text>
        <Text style={styles.hint}>
          Check device logs. For EAS builds, set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in EAS Secrets.
        </Text>
      </View>
    );
  }
  if (App) return <App />;
  return (
    <View style={styles.centered}>
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});

registerRootComponent(Root);
