## Values Dating – Production Readiness Checklist (iOS / TestFlight)

This is the single source of truth for getting the **Values Dating** Expo app ready for a stable TestFlight build.

It reflects how the app is actually implemented today (React Navigation, Supabase auth, mock discovery/chat) and should be followed **before every release**.

---

### 1. App Configuration (`app.json`, assets, env)

- **Expo config sanity check**
  - **File**: `app.json`
  - **Verify**:
    - **`expo.name`**: `Values Dating` (what shows under the icon).
    - **`expo.slug`**: `values-dating` (used by EAS; keep stable).
    - **`expo.version`**: Semantic app version, bump for every App Store submission (e.g. `1.0.1`).
    - **`expo.ios.bundleIdentifier`**: `com.values.app` (must match App Store / Apple Developer configuration).
    - **`expo.android.package`**: `com.values.app` (future Android).
    - **`expo.scheme`**: `values` (used for deep links and Supabase OAuth redirect).
    - **`expo.imageMaxAge`**: keep at `60` (image cache TTL in seconds).

- **Icons and splash**
  - **Files/paths**:
    - App icon: `assets/icon.png`
    - Splash: `assets/splash-icon.png`
    - Android adaptive icon: `assets/adaptive-icon.png`
    - Favicon: `assets/favicon.png`
  - **Checks before release**:
    - Icon and splash use **final branding** (no dev watermark).
    - Splash looks good on 6.1" devices in both light/dark system modes (even though app is light-only).
    - No obvious pixelation on @3x iPhones.

- **Deep linking and scheme**
  - **Files**:
    - `app.json` → `expo.scheme: "values"`
    - Auth redirect path used in code: `AuthSession.makeRedirectUri({ scheme: Constants.expoConfig?.scheme || 'values', path: 'auth/callback' })` in `services/authService.ts`.
  - **Checks**:
    - In Supabase Dashboard → **Authentication → URL Configuration**, include **iOS redirect URL** used in production:
      - `values://auth/callback`
      - (If you use a dev scheme for development, ensure the production project uses `values` only.)

- **Environment variables required for production**
  - **Source**:
    - `lib/supabase.ts` (throws if env vars missing).
    - `services/api.ts` (optional API base URL).
    - `app.json` → `expo.extra`.
  - **Required in `.env` or EAS secrets**:
    - **`EXPO_PUBLIC_SUPABASE_URL`**: Your Supabase project URL.
    - **`EXPO_PUBLIC_SUPABASE_ANON_KEY`**: Supabase anon key (RLS-protected, but still treat as secret).
  - **Recommended / optional**:
    - **`EXPO_PUBLIC_API_URL`**: Only if you start using `services/api.ts` against a real backend.
  - **Per-build config**:
    - In EAS **Build profiles** (Dashboard or `eas.json` plus env), make sure `EXPO_PUBLIC_*` values are set for the `preview` profile at minimum.
  - **Pre-build check**:
    - Run `expo config --type public` or `npx expo config --json` and confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present and correct.

- **`app.json` extras**
  - **File**: `app.json` → `expo.extra`
  - Today:
    - `"googleClientId": ""` (unused placeholder).
    - `"supabaseRedirectTo": "${EXPO_PUBLIC_SUPABASE_URL}/auth/v1/callback"`.
  - **Checklist**:
    - If you rely on Supabase email magic links or other flows that use `supabaseRedirectTo`, verify the URL is correct for your project.

---

### 2. Auth & Security (Supabase, OAuth, RLS)

- **Supabase client configuration**
  - **File**: `lib/supabase.ts` (re-exported by `services/supabase.ts`).
  - **What it does**:
    - Creates a **single Supabase client** with:
      - `AsyncStorage` for `supabase.auth` session persistence.
      - Foreground `AppState` listener to refresh sessions.
    - Throws if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing.
  - **Release checklist**:
    - Confirm **only one Supabase client** is used (no stray `createClient` calls elsewhere).
    - Confirm sessions survive app restarts and foregrounding in a **release build**, not just dev.

- **Auth orchestration (contexts and hooks)**
  - **Files**:
    - `contexts/AuthContext.tsx`
    - `hooks/useAuthUserSync.ts`
    - `hooks/useValuesCompletionSync.ts`
    - `utils/authUserAdapter.ts`
  - **What to check**:
    - Sign-in via Google/Apple/Phone results in `AuthUser` with correct flags (`isOnboardingComplete`, `isProfileComplete`, `isValuesComplete`).
    - `AuthContext` successfully stores and restores sessions (SecureStore + Supabase).
    - `AuthGate` (in `components/AuthGate.tsx`) correctly routes:
      - Unauthed → auth screens.
      - Partially onboarded users → onboarding.
      - Complete users → main tabs.

- **Google OAuth configuration**
  - **Code path**: `services/authService.ts` → `authService.signInWithGoogle`.
  - **Behavior**:
    - Uses `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`.
    - Builds `redirectTo` using `AuthSession.makeRedirectUri` with:
      - `scheme`: `values` (or `Constants.expoConfig?.scheme`).
      - `path`: `auth/callback`.
    - Manually opens browser with `WebBrowser.openAuthSessionAsync`.
  - **Supabase Dashboard** (per project):
    - **Authentication → Providers → Google**:
      - Client ID / secret from Google Cloud console.
      - Authorized redirect URIs include the value generated in the app (e.g. `values://auth/callback` or the Expo dev URL for development).
    - **Authentication → URL Configuration**:
      - Add **`values://auth/callback`** at minimum.
  - **Google Cloud console**:
    - iOS app for OAuth:
      - Bundle ID: **`com.values.app`**.
      - If using reversed client ID style URLs, keep them in sync with the `scheme` configuration (today the app uses `values` directly, not a reversed client ID).

- **Apple Sign In**
  - **Code path**: `services/authService.ts` → `authService.signInWithApple`.
  - **Behavior**:
    - Native Apple sign-in using `expo-apple-authentication`.
    - Exchanges credential with backend via `loginWithApple` (`services/backendAuthApi.ts`).
  - **Apple Developer configuration**:
    - In Apple Developer → Identifiers:
      - Ensure the app ID **`com.values.app`** has **Sign In with Apple** enabled.
    - In your backend:
      - Apple keys and services IDs must be properly configured.
  - **QA**:
    - First-time Apple sign in returns name and email, subsequent sign-ins still work when name/email are not provided.

- **Phone auth (mock today)**
  - **Code**: `services/authService.ts` → `startPhoneSignIn`, `confirmPhoneCode`.
  - **Behavior**:
    - Local mock OTP (no real SMS provider; uses `mockPhoneCodes` map).
    - Exchanges OTP via `verifyPhoneCode` in `services/backendAuthApi.ts` (currently a mock backend).
  - **Production note**:
    - Today this is **not production-grade**. Keep it hidden behind the current UX (no direct OTP entry from login). Only enable full phone auth after a real backend & SMS provider are wired.

- **RLS policies (Supabase)**
  - **Migrations / SQL files** (from Supabase folder in repo):
    - Profiles: `supabase/migrations/..._profiles.sql` (exact path per your migrations).
    - Matches: `supabase/migrations/..._matches.sql`.
    - Chats: `supabase/migrations/..._chats.sql` and `004_storage_block_chat_media.sql` (blocks chat media storage).
    - Storage bucket: `supabase/migrations/002_storage_buckets.sql` → `avatars` bucket with policies.
  - **Production expectations**:
    - **Profiles**:
      - Users can read **their own** profile and discoverable profiles.
      - Users can only update **their own** profile row.
    - **Matches**:
      - Users only see matches where they are `user_id_1` or `user_id_2`.
    - **Chats**:
      - Users only see messages belonging to their matches.
    - **Storage (avatars)**:
      - Users can upload/update/delete **only their own** avatars.
  - **Pre-release Supabase checks**:
    - In Supabase SQL console or Table Editor:
      - Try selecting rows as a non-admin client with your anon key and confirm RLS rules work as intended (no global `select` without `auth.uid()` guards).

- **Logging sensitive data**
  - **Global principle**:
    - No tokens, full Supabase keys, or PII should be logged in production.
  - **Code today**:
    - `services/authService.ts` has extensive `[DEBUG]` logs, but:
      - Keys are masked (only partial anon key shown).
      - However, logs are **not yet fully guarded** by `__DEV__`.
    - **Change made**:
      - `screens/auth/LoginScreen.tsx` now wraps debug logs inside `if (__DEV__) { ... }` so they are silent in production while still available in dev.
  - **Action items**:
    - Consider migrating `authService` debug logs to a **configurable logger** that is:
      - Verbose in dev / preview.
      - Minimal or off in production (except for high-level error breadcrumbs).

---

### 3. Networking & Error Handling

- **Global error boundary**
  - **File**: `components/ErrorBoundary.tsx`
  - **Usage**: Wrapped around the app in `App.tsx`.
  - **Checklist**:
    - In production, the fallback UI should **not** show raw stack traces (today, detailed info is shown only under `__DEV__`).
    - Confirm the error boundary is indeed wrapping `NavigationContainer` and primary providers.

- **Auth-specific error handling**
  - **File**: `utils/errorHandler.ts`
  - Provides:
    - `getAuthErrorMessage`
    - `showAuthError`
    - `logAuthError`
  - **Usage examples**:
    - `screens/auth/LoginScreen.tsx` uses `logAuthError('LoginScreen', error)` and `showAuthError(error, 'Sign In Error')`.
  - **Checklist**:
    - Ensure user-facing error messages are **friendly and non-technical**.
    - Ensure `logAuthError` does not send PII to any remote logging provider (today it only logs locally).

- **Networking layer (generic API)**
  - **File**: `services/api.ts`
  - **Behavior**:
    - Typed `get` and `post` wrappers over `fetch`.
    - Throws `ApiError` with `status` and `statusText` on non-OK responses.
    - Uses `API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com'`.
  - **Production guidance**:
    - Only set `EXPO_PUBLIC_API_URL` in environments where you have a real backend.
    - Centralize **auth headers** and **error mapping** here once you start calling your own backend.

- **Network failure handling**
  - **Where to look**:
    - For auth: `services/authService.ts` maps network issues to `AuthError` with `NETWORK_ERROR` code.
    - For fetch-based APIs: `services/api.ts` wraps low-level errors as `ApiError` with `status = 0`.
  - **Manual QA** (per release):
    - On a device:
      - Turn on **Airplane Mode** while:
        - Attempting Google sign-in.
        - Navigating Discover / Matches (which today still use mock data but ensure no hard crashes).
      - Confirm you see **clear, user-facing messages** and not blank screens or infinite spinners.

- **What to log vs not log**
  - **Log (OK)**:
    - Error codes and short, non-PII messages (e.g. `AuthError` codes).
    - Screen names, event types (for analytics).
  - **Do NOT log**:
    - Full access/refresh tokens.
    - Full Supabase anon key.
    - Email addresses / phone numbers, except in development logs guarded by `__DEV__`.

---

### 4. Performance (lists, images, profiling)

- **Image optimization**
  - **Files**:
    - `services/imagePicker.ts` (`pickImageFromLibrary`, `resizeProfileImage`).
    - `utils/imageUtils.ts` (uses `expo-image-manipulator`).
    - Display components: `components/ProfileMainPhoto.tsx`, `components/ProfilePhotoCarousel.tsx`, `components/DiscoverProfileCard.tsx`.
  - **Current behavior**:
    - Picker compresses images with `quality: 0.7`, square aspect.
    - `resizeProfileImage` attempts to resize using `ImageManipulator`; if it fails, it returns the original URI.
    - **Note**: `expo-image-manipulator` is referenced but may not yet be in `package.json` – verify the dependency exists to avoid runtime errors.
  - **Checklist**:
    - Verify all profile images load smoothly in **Discover**, **Matches**, and **Profile** in a release build.
    - Ensure there are no red-screen errors from `ImageManipulator` on large photos.

- **FlatList / chat list optimizations**
  - **Files**:
    - `screens/DiscoverScreen.tsx` (likely uses `FlatList` or similar for cards).
    - `screens/MatchesScreen.tsx` (matches list).
    - `components/MatchChatScreen.tsx` (chat messages list).
  - **Guidance**:
    - Keep `keyExtractor` stable and simple (e.g. `id` from backend, not index).
    - Ensure `initialNumToRender` and `maxToRenderPerBatch` are reasonable for typical match list sizes.
    - Use `removeClippedSubviews` carefully (test on low-memory devices).

- **Known heavy screens to test**
  - **Discover**:
    - Rapid swiping / scrolling through many profiles.
  - **Matches + Chat**:
    - Long chat histories (even though data is mocked today).
  - **Profile Editor**:
    - Multiple profile photo uploads and reordering.

- **Profiling steps (per release)**
  - In **development build**, use:
    - React Native performance monitor.
    - `monitorMemory` (dev-only) from `services/memoryMonitor.ts` if enabled.
  - In a **preview EAS build**:
    - Scroll through Discover and Matches for ~2–3 minutes.
    - Open and close Chat flows.
    - Watch for frame drops, long hitches, or OOMs on mid-range devices (e.g. iPhone 12 / SE 3rd gen).

---

### 5. Privacy & Permissions

- **Photo library permission flow**
  - **Files**:
    - `services/photoLibraryPermission.ts` (`ensurePhotoLibraryPermission`).
    - `hooks/usePhotoLibraryPermission.ts`.
    - `services/imagePicker.ts` and `components/ProfilePhotosPicker.tsx`.
    - `app.json` → `expo.plugins[0]` (`expo-image-picker`).
  - **Behavior**:
    - App shows an in-app explanation before requesting system photos permission.
    - If denied, suggests user go to Settings.
  - **App Store compliance**:
    - `app.json` → `expo.plugins` for `expo-image-picker` includes:
      - `photosPermission`: `"We use your photos only so you can choose profile pictures to show to potential matches."`
    - This matches the app’s actual behavior and Apple’s guideline to state **why** photos are needed.

- **Location / neighborhood handling**
  - **Files**:
    - `services/geocoding.ts` (OpenStreetMap Nominatim search & reverse geocode).
    - Any profile fields storing neighborhood / city (in Supabase migrations and profile services).
  - **Behavior**:
    - No direct GPS location permission is requested; instead, geocoding uses text queries.
  - **Privacy considerations**:
    - Avoid storing precise street-level addresses. Use city / neighborhood-level data if needed for discovery.
    - Document in your privacy policy how you use location-related fields.

- **Apple privacy links / guidelines**
  - Apple Human Interface Guidelines on:
    - **Sign in with Apple** placement (Apple on top on iOS) – already respected in `screens/auth/LoginScreen.tsx` (Apple button shown first on iOS).
  - **App Store Connect**:
    - Ensure **Privacy Nutrition Labels** reflect:
      - Data collected: email, profile info, optional location/neighborhood.
      - Data usage: account, matchmaking, analytics (if/when enabled), not tracking across apps.

---

### 6. Analytics & Logging

- **Analytics integration**
  - **File**: `services/analytics.ts`
  - **Behavior today**:
    - Default provider is `ConsoleAnalyticsProvider`, primarily logging to console (and usually gated by `__DEV__`).
    - API surface: `initializeAnalytics`, `trackEvent`, `trackScreenView`, plus higher-level helpers.
  - **To plug in a real provider**:
    - Implement an `AnalyticsProvider` for Amplitude/Mixpanel/PostHog/etc.
    - Wire it in via `initializeAnalytics` at app startup (`App.tsx`).

- **Important events to track**
  - **Onboarding & auth**:
    - `trackSignUp` – new user registration.
    - `trackOnboardingStarted` / `trackOnboardingCompleted`.
    - `trackProfileCompleted`.
  - **Core usage**:
    - First like / pass in Discover:
      - `trackMatchLiked`, `trackMatchPassed`.
    - First match created.
    - First chat message sent in `MatchChatScreen`.
  - **Retention / churn**:
    - App open / resume events (to be added if needed).
    - “Churn” proxies like uninstall can’t be directly tracked; use inactivity windows via back-end metrics instead.

- **Toggling debug logging for production**
  - **Code today**:
    - Many dev logs are guarded via `if (__DEV__) { ... }`.
    - **Change implemented**:
      - `screens/auth/LoginScreen.tsx` debug logs (Supabase test and Google sign-in button press) are now behind `if (__DEV__)`, so they **do not** appear in production logs.
  - **Recommendations**:
    - Gradually migrate remaining `[DEBUG]` logs in `services/authService.ts` to:
      - A shared logger that can be configured per environment (dev/staging/prod).
      - Or wrap them in `if (__DEV__)` when you’re confident you no longer need verbose production diagnostics.

---

### 7. Release Process (EAS, TestFlight, QA)

- **EAS build profiles**
  - **File**: `eas.json`
  - Current content:
    - `build.preview`:
      - `"distribution": "internal"`
      - `"ios.simulator": false`
    - `submit.preview`: `{}` (defaults).
  - **Usage**:
    - Use `preview` for **internal TestFlight** and QA builds.

- **Build commands**
  - From repo root:
    - **Preview iOS build**:
      - `eas build --profile preview --platform ios`
    - **Submit to TestFlight** (after build completes):
      - `eas submit --platform ios --profile preview`
  - **Checks before running**:
    - `app.json` version and iOS build number (if using `expo.versionCode`/`ios.buildNumber`) are bumped appropriately.
    - `.env` or EAS secrets have all required `EXPO_PUBLIC_*` variables.

- **TestFlight metadata checklist**
  - In App Store Connect → Your App → TestFlight / App Store:
    - **Screenshots**:
      - At least for main target iPhone sizes (6.1" and 6.7"), showing:
        - Onboarding.
        - Discover.
        - Matches.
        - Chat.
        - Profile editing.
    - **Description**:
      - Highlight values-based matching and privacy-respecting design.
    - **What to test** (for TestFlight testers):
      - Signing up with Google and Apple.
      - Completing profile and values onboarding.
      - Matching and starting first chat.
    - **Review notes (if relevant)**:
      - Clarify any use of mock data (e.g. Discovery feed is non-production / test data) if applicable.

- **Manual QA checklist per release**
  - **Auth & onboarding**:
    - Sign in with **Google** on iOS device:
      - Works from a clean install.
      - Handles cancellation gracefully (no crash, friendly toast/dialog).
    - Sign in with **Apple** on iOS:
      - First-time sign-in with name/email.
      - Subsequent sign-in without name/email.
    - Phone auth entry points do **not** appear in a way that promises production SMS unless fully wired.
  - **Profile & values**:
    - Complete full profile setup (photo, bio, values).
    - Re-open app and confirm profile persists.
  - **Discovery**:
    - Scroll through discovery cards, like/pass several profiles.
    - Ensure UI transitions are smooth, no red screens.
  - **Matches & chat**:
    - Open Matches tab, tap into a match, send multiple chat messages.
    - Back navigation and keyboard behavior work correctly.
  - **Edit profile & Settings**:
    - Change profile photo(s), bio, values, save and confirm.
    - Visit Settings, check links/help items (no dead links).
  - **Offline behavior**:
    - Turn on Airplane Mode while on Discover, Matches, and Login, and verify:
      - User sees informative errors, not endless spinners.
  - **Crash & error handling**:
    - Force a recoverable error (e.g. simulate Supabase URL misconfig in dev or staging build) and confirm:
      - Error boundary screen appears instead of full crash.

---

### 8. Future Work / Nice-to-Haves

- **Apple Sign In & phone auth hardening**
  - Replace mock phone OTP logic in `services/authService.ts` with:
    - Real backend endpoints for `startPhoneSignIn` and `confirmPhoneCode`.
    - SMS provider (Twilio, Firebase, etc.) on the server.
  - Add full analytics events for each auth method.

- **Likes You screen**
  - New screen under Matches to surface:
    - People who liked you but are not yet mutual matches.
  - Requires Supabase schema support (e.g. `likes` table) and RLS adjustments.

- **Paid features**
  - Potential features:
    - Boosts, Super Likes, read receipts, etc.
  - Implementation notes:
    - Use App Store in-app purchases / subscriptions.
    - Keep paywalled features clearly separated in navigation and analytics.

- **Push notifications improvements**
  - Add:
    - Expo push notifications for:
      - New matches.
      - New chat messages.
    - Background handling: tapping a notification should deep link into:
      - Match detail (`MatchDetailScreen`) or
      - Specific tab (Matches).
  - Ensure:
    - Opt-in flow is clear.
    - Permissions are requested **contextually**, not on first app launch.

---

### 9. Summary of Implemented Safe Production Tweaks

- **Logging hardening**
  - `screens/auth/LoginScreen.tsx`:
    - All Supabase test and Google sign-in debug logs are now wrapped in `if (__DEV__) { ... }`.
    - This prevents verbose debug output from appearing in production logs while keeping it available in development.

Use this document as your **pre-flight checklist** before every TestFlight build, updating it whenever you change auth flows, navigation, or backend behavior so future you (or future engineers) can confidently ship. 

