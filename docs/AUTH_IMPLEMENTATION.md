# Unified Authentication Layer Implementation

## Overview

This document describes the unified authentication layer that supports Google, Apple, and Phone number (OTP) sign-in methods.

## 1. Core Auth Types

### AuthUser Type (`types/auth.ts`)

```typescript
export interface AuthUser {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string; // Optional - phone-only users might not have email
  phoneNumber?: string; // Optional - email-only users might not have phone
  photoUrl?: string;
  authProvider: 'google' | 'apple' | 'phone';
  createdAt: string;
  updatedAt?: string;
  
  // Onboarding status flags
  isOnboardingComplete?: boolean;
  isProfileComplete?: boolean;
  isValuesComplete?: boolean;
}
```

**Key Features:**
- Flexible email/phone fields (both optional)
- Auth provider tracking
- Extensible for future features (subscription flags, preferences)

## 2. AuthContext API

### Hook Usage

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const {
    user,              // AuthUser | null
    loading,          // boolean
    phoneAuthState,   // PhoneAuthState | null
    signInWithGoogle, // () => Promise<void>
    signInWithApple,  // () => Promise<void>
    startPhoneSignIn, // (phoneNumber: string) => Promise<void>
    confirmPhoneCode, // (code: string) => Promise<void>
    signOut,          // () => Promise<void>
    clearPhoneAuthState, // () => void
  } = useAuth();
  
  // Use auth methods...
}
```

### Context Features

- **Session Persistence**: Uses `expo-secure-store` to persist auth sessions securely
- **Auto-restore**: Automatically restores session on app launch
- **Token Validation**: Validates session tokens on restore
- **Error Handling**: Provides structured `AuthError` with codes and provider info

## 3. AuthGate Integration

### Root Component Structure (`App.tsx`)

```typescript
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
        <StatusBar style="auto" />
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

### AuthGate Component (`components/AuthGate.tsx`)

```typescript
export const AuthGate: React.FC = () => {
  const { user, loading } = useAuth();
  
  // Sync AuthUser to UserStore when user signs in
  useAuthUserSync();

  if (loading) {
    return <LoadingScreen />;
  }

  // AppNavigator handles routing based on auth state
  return <AppNavigator />;
};
```

**Flow:**
1. Shows loading while checking auth state
2. If `user == null` → AppNavigator shows auth screens (Welcome/Login)
3. If `user != null` → AppNavigator shows main app or onboarding

## 4. Navigation Integration

### AppNavigator (`navigation/AppNavigator.tsx`)

```typescript
export const AppNavigator: React.FC = () => {
  const { user: authUser } = useAuth();
  const isProfileComplete = useUserStore((state) => state.isProfileComplete);
  const isValuesComplete = useUserStore((state) => state.isValuesComplete);
  
  const phase = useMemo(() => {
    if (!authUser) return 'auth';
    if (!isProfileComplete) return 'profile';
    if (!isValuesComplete) return 'values';
    return 'main';
  }, [authUser, isProfileComplete, isValuesComplete]);
  
  // Routes based on phase...
};
```

**Navigation Flow:**
- `auth` → Welcome/Login screens
- `profile` → Profile setup screens
- `values` → Values onboarding screens
- `main` → Main app (Discover, Matches, Profile)

## 5. Auth Service (Mock/Extensible)

### Service Structure (`services/authService.ts`)

All auth methods are structured to easily integrate with backend:

```typescript
export const authService = {
  async signInWithGoogle() {
    // Mock implementation
    // In production: Use @react-native-google-signin/google-signin
    // Then: POST /auth/google { idToken }
  },
  
  async signInWithApple() {
    // Mock implementation
    // In production: Use expo-apple-authentication
    // Then: POST /auth/apple { identityToken }
  },
  
  async startPhoneSignIn(phoneNumber: string) {
    // Mock implementation
    // In production: POST /auth/phone/start { phoneNumber }
    // Backend sends SMS via Twilio/Firebase
  },
  
  async confirmPhoneCode(phoneNumber: string, code: string) {
    // Mock implementation
    // In production: POST /auth/phone/verify { code, verificationId }
  },
};
```

**Backend Integration Points:**
- Replace mock implementations with real provider SDKs
- Add backend API calls to exchange tokens
- Backend validates tokens and returns user + session

## 6. User Sync Bridge

### useAuthUserSync Hook (`hooks/useAuthUserSync.ts`)

Bridges `AuthUser` (auth layer) to `User` (profile layer):

```typescript
export function useAuthUserSync(): void {
  const { user: authUser } = useAuth();
  const { currentUser, setCurrentUser } = useUserStore();
  
  // When authUser signs in, create User in UserStore
  // This triggers onboarding flow if profile incomplete
}
```

## 7. Login Screen

### Unified Login Screen (`screens/auth/LoginScreen.tsx`)

Provides UI for all three auth methods:
- Google sign-in button
- Apple sign-in button (iOS only)
- Phone number input with OTP verification

**Features:**
- Error handling with user-friendly alerts
- Loading states
- OTP code input flow
- Development mode: Shows OTP code in console

## 8. Error Handling

### AuthError Class

```typescript
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: AuthProvider
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
```

**Error Codes:**
- `GOOGLE_SIGN_IN_ERROR`
- `APPLE_SIGN_IN_ERROR` / `APPLE_IOS_ONLY`
- `PHONE_SIGN_IN_START_ERROR`
- `PHONE_CODE_VERIFY_ERROR`
- `INVALID_PHONE`
- `CODE_NOT_FOUND`
- `CODE_EXPIRED`
- `INVALID_CODE`
- `PERSIST_ERROR`

## 9. Security

- **Secure Storage**: Uses `expo-secure-store` for sensitive auth data
- **Token Expiration**: Validates session expiration
- **Session Validation**: Checks token validity on restore
- **Auto-cleanup**: Clears corrupted/invalid sessions

## 10. Future Extensibility

The architecture supports easy addition of:
- Backend API integration
- Token refresh mechanisms
- Multi-device session management
- Subscription flags
- User preferences
- Additional auth providers (e.g., Facebook, Twitter)

## Installation

Add to `package.json`:
```json
{
  "dependencies": {
    "expo-secure-store": "~14.0.4"
  }
}
```

Run:
```bash
npm install
# or
npx expo install expo-secure-store
```

## Usage Example

```typescript
import { useAuth } from '../contexts/AuthContext';

function LoginButton() {
  const { signInWithGoogle, loading } = useAuth();
  
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      // User is now authenticated, navigation updates automatically
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    <Button 
      title="Sign in with Google" 
      onPress={handleSignIn}
      disabled={loading}
    />
  );
}
```
