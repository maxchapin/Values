# Supabase Integration Setup

## Overview

The app now uses Supabase for Google OAuth authentication. Supabase handles the OAuth flow automatically and provides session management.

## Installation

Install the Supabase client library:

```bash
npm install @supabase/supabase-js
```

Or with yarn:

```bash
yarn add @supabase/supabase-js
```

## Configuration

### 1. Environment Variables (`.env`)

Your `.env` file should already have:

```env
EXPO_PUBLIC_SUPABASE_URL=https://nkcaaujkovelpqahmuug.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. App Configuration (`app.json`)

The `app.json` has been updated with:

```json
{
  "expo": {
    "extra": {
      "supabaseRedirectTo": "https://nkcaaujkovelpqahmuug.supabase.co/auth/v1/callback"
    }
  }
}
```

## How It Works

### Google Sign-In Flow

1. **User taps "Continue with Google"**
   - `signInWithGoogle()` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`

2. **Supabase opens webview**
   - Supabase automatically opens a webview for Google sign-in
   - User signs in with their Google account

3. **Supabase handles redirect**
   - After sign-in, Supabase redirects back to the Expo app
   - The redirect URL is configured in `supabase.ts`

4. **Session is created**
   - Supabase automatically creates a session
   - `AuthContext` listens for auth state changes via `onAuthStateChange`
   - When `SIGNED_IN` event fires, the user is converted to `AuthUser` format and persisted

5. **Navigation to onboarding**
   - `AuthGate` detects the authenticated user
   - `AppNavigator` routes to values onboarding if needed

## Key Files

### `services/supabase.ts`
- Initializes Supabase client with Expo-specific configuration
- Configures redirect URL for OAuth callbacks

### `services/authService.ts`
- `signInWithGoogle()` now uses Supabase OAuth
- Converts Supabase user to `AuthUser` format
- Creates `AuthSession` from Supabase session

### `contexts/AuthContext.tsx`
- Listens for Supabase auth state changes
- Automatically syncs Supabase sessions to local state
- Converts Supabase users to `AuthUser` format
- Handles sign-out from Supabase

## Supabase Dashboard Setup

Make sure your Supabase project is configured:

1. **Enable Google OAuth Provider**
   - Go to Authentication → Providers → Google
   - Enable Google provider
   - Add your Google OAuth Client ID and Secret
   - Set authorized redirect URLs:
     - `https://nkcaaujkovelpqahmuug.supabase.co/auth/v1/callback`
     - Your Expo redirect URL (for development)

2. **Configure Redirect URLs**
   - In Supabase Dashboard → Authentication → URL Configuration
   - Add your app's redirect URLs

## Testing

1. Install dependencies: `npm install`
2. Make sure `.env` has your Supabase credentials
3. Restart Expo dev server: `npm start`
4. Tap "Continue with Google"
5. Sign in with Google account
6. Should redirect back to app and show authenticated state

## Troubleshooting

### "Missing Supabase environment variables"
- Check that `.env` file exists and has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Restart Expo dev server after adding environment variables

### "Sign in cancelled"
- User closed the webview before completing sign-in
- This is expected behavior

### Session not persisting
- Check that Supabase session is being created (check Supabase Dashboard → Authentication → Users)
- Check `AuthContext` logs for session restoration messages

### Redirect not working
- Verify `supabaseRedirectTo` in `app.json` matches your Supabase project URL
- Check that the redirect URL is configured in Supabase Dashboard

## Next Steps

- [ ] Install `@supabase/supabase-js` package
- [ ] Configure Google OAuth in Supabase Dashboard
- [ ] Test Google sign-in flow
- [ ] (Optional) Migrate Apple Sign-In to Supabase
- [ ] (Optional) Migrate Phone Auth to Supabase
