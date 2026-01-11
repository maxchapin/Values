import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useUserStore } from '../store/userStore';
import { PrimaryButton } from '../components/PrimaryButton';

/**
 * Profile Screen - Placeholder
 * TODO: Implement full profile view and editing
 */
export const ProfileScreen: React.FC = () => {
  const { currentUser, logout } = useUserStore();

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No Profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{currentUser.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Age</Text>
        <Text style={styles.value}>{currentUser.age}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{currentUser.location}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Bio</Text>
        <Text style={styles.value}>{currentUser.bio}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Selected Values</Text>
        <Text style={styles.value}>{currentUser.selectedValues.length} values selected</Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Logout"
          onPress={logout}
          style={{ backgroundColor: '#ff3b30' }}
        />
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
    color: '#333',
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  footer: {
    marginTop: 32,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});
