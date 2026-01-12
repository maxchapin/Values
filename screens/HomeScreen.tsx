import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useItemsStore } from '../store/itemsStore';
import { PrimaryButton } from '../components/PrimaryButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useDebugAccess } from '../hooks/useDebugAccess';
import { trackScreenView } from '../services/analytics';
import { ScreenContainer } from '../components/ScreenContainer';
import { theme } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { ExampleItem } from '../services/api';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { items, isLoading, error, fetchItems } = useItemsStore();
  const { handlePress: handleTitlePress, isDebugMode } = useDebugAccess();

  useEffect(() => {
    trackScreenView('Home');
  }, []);

  useEffect(() => {
    if (isDebugMode) {
      navigation.navigate('Debug');
    }
  }, [isDebugMode, navigation]);

  useEffect(() => {
    // Fetch items when component mounts
    if (items.length === 0 && !isLoading) {
      fetchItems();
    }
  }, [items.length, isLoading, fetchItems]);

  const handleItemPress = (itemId: string): void => {
    navigation.navigate('Details', { itemId });
  };

  const renderItem = ({ item }: { item: ExampleItem }): JSX.Element => {
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleItemPress(item.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
        <Text style={styles.itemDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading items..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Something went wrong"
        message={error}
        actionLabel="Try Again"
        onAction={fetchItems}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="No Items"
        message="There are no items to display at the moment."
      />
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.7}>
          <Text style={styles.headerText}>Example Items</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerText: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  listContent: {
    padding: theme.spacing.base,
  },
  itemContainer: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  itemDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
  itemDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
});
