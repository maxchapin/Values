import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useItemsStore } from '../store/itemsStore';
import { EmptyState } from '../components/EmptyState';
import { ScreenContainer } from '../components/ScreenContainer';
import { theme } from '../theme';
import { RootStackParamList } from '../navigation/types';

type DetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'Details'>;

export const DetailsScreen: React.FC<DetailsScreenProps> = ({ route }) => {
  const { itemId } = route.params;
  const getItemById = useItemsStore((state) => state.getItemById);
  const item = getItemById(itemId);

  if (!item) {
    return (
      <EmptyState
        icon="🔍"
        title="Item Not Found"
        message={`The item with ID "${itemId}" could not be found.`}
      />
    );
  }

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
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
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing['4xl'],
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  itemId: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xl,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  section: {
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  sectionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
});
