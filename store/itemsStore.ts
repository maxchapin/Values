import { create } from 'zustand';
import { ExampleItem, getExampleItems } from '../services/api';

/**
 * Items Store State Interface
 */
interface ItemsStore {
  items: ExampleItem[];
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  getItemById: (id: string) => ExampleItem | undefined;
}

/**
 * Zustand store for managing example items globally
 * Small, simple, and easy to extend
 */
export const useItemsStore = create<ItemsStore>((set, get) => ({
  // Initial state
  items: [],
  isLoading: false,
  error: null,

  // Fetch items from API
  fetchItems: async (): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const items = await getExampleItems();
      set({ items, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch items',
        isLoading: false,
      });
    }
  },

  // Get a specific item by ID
  getItemById: (id: string): ExampleItem | undefined => {
    return get().items.find((item) => item.id === id);
  },
}));
