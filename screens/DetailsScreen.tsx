import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useItemsStore } from '../store/itemsStore';
import { RootStackParamList } from '../navigation/types';

type DetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'Details'>;

export const DetailsScreen: React.FC<DetailsScreenProps> = ({ route }) => {
  const { itemId } = route.params;
  const getItemById = useItemsStore((state) => state.getItemById);
  const item = getItemById(itemId);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Item Not Found</Text>
        <Text style={styles.description}>
          The item with ID "{itemId}" could not be found.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.itemId}>ID: {item.id}</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.sectionText}>{item.description}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Created At</Text>
        <Text style={styles.sectionText}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  itemId: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 24,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sectionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
