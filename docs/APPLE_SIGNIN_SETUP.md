# Apple Sign-In Setup Guide

This guide walks you through setting up Sign in with Apple for your React Native Expo app.

## Prerequisites

- Apple Developer account (required)
- iOS device or simulator for testing
- Expo project configured
- App installed dependencies (already added to package.json)

## Step 1: Install Dependencies

The required package is already added to `package.json`:

```json
{
  "dependencies": {
    "expo-apple-authentication": "~7.1.1"
  }
}
```

Run:
```bash
npm install
# or
npx expo install expo-apple-authentication
```

## Step 2: Apple Developer Console Setup

### 2.1 Enable Sign in with Apple Capability

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Select "Identifiers" > Your App ID
4. Enable "Sign in with Apple" capability
5. Save changes

### 2.2 Configure App ID

1. In your App ID configuration, ensure:
   - Bundle ID matches your `app.json` iOS bundle identifier
   - "Sign in with Apple" is enabled
   - Primary App ID is configured

### 2.3 Create Service ID (Optional - for web/backend)

If you need to authenticate users on web or backend:
1. Create a new "Services ID" in Identifiers
2. Enable "Sign in with Apple"
3. Configure domains and redirect URLs
4. Note the Service ID for backend use

## Step 3: Configure app.json

Update your `app.json` with the Apple Authentication plugin:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.values.app",
      "infoPlist": {
        "NSAppleMusicUsageDescription": "This app uses Apple Sign In for authentication."
      }
    },
    "plugins": [
      [
        "expo-apple-authentication",
        {
          "appleAuthentication": {
            "enabled": true
          }
        }
      ]
    ]
  }
}
```

**Important Notes:**
- Bundle identifier must match your Apple Developer App ID
- Plugin configuration enables native Apple Authentication capability
- Info.plist description is required for App Store submission

## Step 4: Build Configuration

### 4.1 Development Build

For development with Expo Go:
- Apple Sign-In **does not work** in Expo Go
- You must use a **development build** (custom native build)

Create development build:
```bash
npx expo run:ios
# or
eas build --profile development --platform ios
```

### 4.2 Production Build

For production:
```bash
eas build --profile production --platform ios
```

## Step 5: Testing Requirements

### 5.1 Device Requirements

- **iOS 13+** required (Apple Sign-In introduced in iOS 13)
- Must test on **real device** or **simulator** (not Expo Go)
- Device must be signed in to iCloud with an Apple ID

### 5.2 Testing Flow

1. Build and run app on iOS device/simulator
2. Navigate to login screen
3. Tap "Continue with Apple"
4. Authenticate with Face ID, Touch ID, or passcode
5. On first sign-in: Provide name/email consent
6. On subsequent sign-ins: No name/email prompt (privacy feature)

## Step 6: Important Apple Sign-In Behaviors

### 6.1 Name and Email Availability

**Critical:** Apple only provides name and email on the **FIRST** sign-in.

- **First Sign-In:**
  - User sees consent screen
  - Can choose to share/hide email
  - Can choose to share/hide name
  - Full name and email available in credential

- **Subsequent Sign-Ins:**
  - No consent screen
  - Name and email are `null`/`undefined`
  - Only stable `userIdentifier` is provided

**Implementation Note:**
The app handles this by:
- Storing name/email on first sign-in
- Merging with existing user data on subsequent sign-ins
- Never overwriting existing data with `null`/`undefined`

### 6.2 Private Relay Email

Apple may provide a **private relay email** (e.g., `user@privaterelay.appleid.com`):
- This is a real, forwardable email address
- User can disable it in Settings
- Backend should treat it as a valid email

### 6.3 User Identifier

- `userIdentifier` is a **stable, unique identifier**
- Same Apple ID = same `userIdentifier`
- Use this for user matching: `apple_${userIdentifier}`

## Step 7: Backend Integration

### 7.1 Identity Token Validation

Apple provides an **identity token** (JWT) that must be validated:

```typescript
// In your backend
POST /auth/apple
{
  "identityToken": "eyJhbGciOiJSUzI1NiIs...",
  "userIdentifier": "001234.abc123def456...",
  "fullName": { "givenName": "John", "familyName": "Doe" }, // Only on first sign-in
  "email": "user@example.com" // Only on first sign-in
}
```

### 7.2 Backend Validation Steps

1. **Verify JWT signature** using Apple's public keys
2. **Validate claims:**
   - `iss` (issuer) = `https://appleid.apple.com`
   - `aud` (audience) = Your app's client ID
   - `exp` (expiration) = Not expired
3. **Extract user identifier** from `sub` claim
4. **Create or update user** in database
5. **Return user + session token**

### 7.3 Apple Public Keys

Fetch Apple's public keys from:
```
GET https://appleid.apple.com/auth/keys
```

Use these to verify JWT signatures.

## Step 8: Error Handling

### Common Errors

**`APPLE_IOS_ONLY`**
- User tried to sign in on non-iOS platform
- Solution: Hide Apple button on Android/web

**`APPLE_NOT_AVAILABLE`**
- Device doesn't support Apple Sign-In (iOS < 13)
- Solution: Show fallback message

**`USER_CANCELLED`**
- User cancelled authentication
- Solution: Handle silently (no error alert)

**`INVALID_CREDENTIAL`**
- Token validation failed
- Solution: Retry authentication

## Step 9: App Store Review

### Requirements

- Must provide alternative sign-in method (Google, Phone, etc.)
- Cannot require Apple Sign-In as only option
- Must handle cancellation gracefully
- Must follow Apple's Human Interface Guidelines

### Guidelines

- Use Apple's exact button wording: "Sign in with Apple" or "Continue with Apple"
- Use approved button styles (black, white, white-outline)
- Don't modify Apple's button design
- Position appropriately (typically above other sign-in options)

## Step 10: Production Checklist

- [ ] Apple Developer account configured
- [ ] App ID has "Sign in with Apple" enabled
- [ ] Bundle identifier matches Apple Developer App ID
- [ ] app.json plugin configured
- [ ] Development build created and tested
- [ ] Backend validates identity tokens
- [ ] Handles first vs. subsequent sign-ins correctly
- [ ] Preserves user data across sign-ins
- [ ] Error handling implemented
- [ ] App Store guidelines followed
- [ ] Alternative sign-in methods available

## Troubleshooting

### "Apple Sign In is not available"

**Causes:**
- Testing in Expo Go (not supported)
- iOS version < 13
- Device not signed in to iCloud
- Capability not enabled in Apple Developer

**Solutions:**
- Use development build (`npx expo run:ios`)
- Test on iOS 13+ device
- Sign in to iCloud on device
- Enable capability in Apple Developer Portal

### Name/Email Missing on Subsequent Sign-Ins

**This is expected behavior!**
- Apple only provides name/email on first sign-in
- App automatically preserves existing data
- No action needed

### Build Errors

**"Missing Apple Authentication capability"**
- Ensure plugin is configured in `app.json`
- Rebuild app after adding plugin
- Check Apple Developer Portal configuration

## Additional Resources

- [Expo Apple Authentication Docs](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- [Apple Identity Token Validation](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user)

## Implementation Summary

The implementation includes:
- ✅ Native Apple Authentication using `expo-apple-authentication`
- ✅ Handles first vs. subsequent sign-ins
- ✅ Preserves user data across sign-ins
- ✅ Proper error handling
- ✅ Apple-compliant button styling
- ✅ iOS-only platform gating
- ✅ Backend integration ready
