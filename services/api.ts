/**
 * API Client for handling HTTP requests
 * Uses fetch with TypeScript typing for type-safe API calls
 */

// Base API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com';

/**
 * API Client configuration options
 */
interface ApiClientOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Typed API client using fetch
 * @param endpoint - API endpoint (relative to base URL)
 * @param options - Request options (method, headers, body)
 * @returns Promise with typed response data
 */
async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = { method: 'GET' }
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new ApiError(
        `API request failed: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    const data = await response.json() as T;

    return {
      data,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
      'Network Error'
    );
  }
}

/**
 * GET request helper
 */
export async function get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
  const response = await apiClient<T>(endpoint, {
    method: 'GET',
    headers,
  });
  return response.data;
}

/**
 * POST request helper
 */
export async function post<T>(
  endpoint: string,
  body: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const response = await apiClient<T>(endpoint, {
    method: 'POST',
    headers,
    body,
  });
  return response.data;
}

// Example types for the getExampleItems function
export interface ExampleItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

/**
 * Example API function that fetches a list of items
 * Currently returns mocked data for development
 * @returns Promise with array of ExampleItem
 */
export async function getExampleItems(): Promise<ExampleItem[]> {
  // Mock data for development
  // TODO: Replace with actual API call when backend is ready
  // return get<ExampleItem[]>('/api/items');
  
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      resolve([
        {
          id: '1',
          title: 'Example Item 1',
          description: 'This is the first example item with some description text.',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          title: 'Example Item 2',
          description: 'This is the second example item with different content.',
          createdAt: '2024-01-16T11:30:00Z',
        },
        {
          id: '3',
          title: 'Example Item 3',
          description: 'A third example item to demonstrate the list functionality.',
          createdAt: '2024-01-17T14:20:00Z',
        },
        {
          id: '4',
          title: 'Example Item 4',
          description: 'Fourth item showing how the API service works with typed responses.',
          createdAt: '2024-01-18T09:15:00Z',
        },
        {
          id: '5',
          title: 'Example Item 5',
          description: 'Final example item to populate the list with more content.',
          createdAt: '2024-01-19T16:45:00Z',
        },
      ]);
    }, 500); // 500ms delay to simulate network request
  });
}
