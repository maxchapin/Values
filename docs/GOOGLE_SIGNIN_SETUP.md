# Google Sign-In Setup Guide

This guide walks you through setting up Google Sign-In for your React Native Expo app.

## Prerequisites

- Google Cloud Console account
- Expo project configured
- App installed dependencies (already added to package.json)

## Step 1: Install Dependencies

The required packages are already added to `package.json`:

```json
{
  "dependencies": {
    "expo-auth-session": "~6.1.1",
    "expo-crypto": "~14.0.4",
    "expo-web-browser": "~14.0.3"
  }
}
```

Run:
```bash
npm install
# or
npx expo install expo-auth-session expo-crypto expo-web-browser
```

## Step 2: Google Cloud Console Setup

### 2.1 Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" or "Google Identity"
   - Click "Enable"

### 2.2 Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace)
3. Fill in required fields:
   - App name: "Values Dating App" (or your app name)
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `openid`
   - `profile`
   - `email`
5. Add test users (if in testing mode)
6. Save and continue

### 2.3 Create OAuth 2.0 Client IDs

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Create credentials for each platform:

#### iOS Client ID:
- Application type: iOS
- Bundle ID: Your iOS bundle ID (e.g., `com.yourcompany.values`)
- Save the **Client ID** (starts with something like `123456789-abc...`)

#### Android Client ID:
- Application type: Android
- Package name: Your Android package name (e.g., `com.yourcompany.values`)
- SHA-1 certificate fingerprint: Get this by running:
  ```bash
  # For development
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  
  # For production (use your release keystore)
  keytool -list -v -keystore path/to/your/release.keystore -alias your-key-alias
  ```
- Save the **Client ID**

#### Web Client ID (for Expo proxy):
- Application type: Web application
- Authorized redirect URIs: Add:
  - `https://auth.expo.io/@your-expo-username/your-app-slug`
  - `exp://localhost:8081` (for local development)
- Save the **Client ID**

## Step 3: Configure app.json

Update your `app.json` with the necessary configuration:

```json
{
  "expo": {
    "name": "Values",
    "slug": "values",
    "scheme": "values",
    "ios": {
      "bundleIdentifier": "com.yourcompany.values",
      "googleServicesFile": "./GoogleService-Info.plist" // Optional: if using Firebase
    },
    "android": {
      "package": "com.yourcompany.values",
      "googleServicesFile": "./google-services.json" // Optional: if using Firebase
    },
    "extra": {
      "googleClientId": "YOUR_WEB_CLIENT_ID_HERE"
    }
  }
}
```

**Important Notes:**
- The `scheme` should match your app's URL scheme
- Use the **Web Client ID** for `googleClientId` (needed for Expo's proxy)
- Bundle identifier and package name must match what you configured in Google Cloud Console

## Step 4: Set Environment Variables

Create a `.env` file in your project root:

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID_HERE
```

Or set it in your `app.json` `extra` section (as shown above).

**Security Note:** For production, use environment variables or secure config management. Never commit client IDs to public repositories if they're sensitive.

## Step 5: Update Code (Already Done)

The implementation is already complete in:
- `services/authService.ts` - Google OAuth flow
- `services/backendAuthApi.ts` - Backend token exchange stub
- `components/GoogleButton.tsx` - Google button UI
- `screens/auth/LoginScreen.tsx` - Login screen integration

## Step 6: Test the Implementation

1. Start your Expo app:
   ```bash
   npm start
   ```

2. Navigate to the login screen

3. Tap "Continue with Google"

4. You should see:
   - Google OAuth consent screen (if first time)
   - Redirect back to app after successful authentication
   - User profile created in AuthContext

## Troubleshooting

### Error: "Google Client ID not configured"
- Make sure `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set in your environment
- Or check `app.json` `extra.googleClientId`

### Error: "Redirect URI mismatch"
- Ensure your redirect URI in Google Cloud Console matches:
  - `https://auth.expo.io/@your-expo-username/your-app-slug`
  - Or `exp://localhost:8081` for local development
- Check that your `app.json` `scheme` matches

### Error: "Invalid client"
- Verify your Client ID is correct
- Ensure you're using the **Web Client ID** (not iOS/Android)
- Check that the OAuth consent screen is configured

### OAuth screen doesn't open
- Make sure `expo-web-browser` is installed
- Check that you're testing on a device/simulator (not just web)
- Verify network connectivity

### Token exchange fails
- Check backend API stub in `services/backendAuthApi.ts`
- In production, ensure your backend endpoint is correctly configured
- Verify backend can validate Google ID tokens

## Production Considerations

### Backend Integration

When ready for production, update `services/backendAuthApi.ts`:

```typescript
export async function loginWithGoogle(idToken: string) {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  
  if (!response.ok) {
    throw new Error('Backend auth failed');
  }
  
  return await response.json();
}
```

### Backend Requirements

Your backend should:
1. Validate the Google ID token server-side
2. Extract user information (email, name, picture, etc.)
3. Create or update user in your database
4. Return user object + session token
5. Handle token refresh if needed

### Security Best Practices

- ✅ Always validate ID tokens server-side
- ✅ Use HTTPS for all API calls
- ✅ Store sensitive tokens in secure storage (already using expo-secure-store)
- ✅ Implement token refresh mechanism
- ✅ Handle token expiration gracefully
- ✅ Log authentication events for security monitoring

## Additional Resources

- [Expo AuthSession Documentation](https://docs.expo.dev/guides/authentication/#google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Identity Platform](https://developers.google.com/identity)
