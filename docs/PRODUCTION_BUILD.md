# Production build – sanity check and test commands

## Critical for EAS builds (avoid white screen)

1. **Environment variables**  
   Set in [EAS Secrets](https://docs.expo.dev/build-reference/variables/#using-secrets-in-environment-variables) (Dashboard → your project → Secrets, or CLI):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (if using Google sign-in)

   If these are missing, the app shows an error screen (with message and hint) instead of a white screen.

2. **Single Supabase client**  
   All code uses the client from `lib/supabase.ts` (re-exported via `services/supabase.ts`).

3. **Root error handling**  
   - `index.ts` dynamically imports `App`; if that fails (e.g. missing env), a fallback screen is shown and the error is logged.
   - `ErrorBoundary` wraps the main UI and logs caught errors in production so they appear in device logs.

---

## Commands to test

### Local production-like run (no dev tools, minified)

```bash
npx expo start --no-dev --minify
```

Then open on device/simulator. Use this to confirm behavior before building with EAS.

### New EAS build (iOS internal/preview)

1. Ensure EAS env/secrets are set (see above).

2. Build:

```bash
eas build --platform ios --profile preview
```

3. Install the build on your device (link from EAS or install the downloaded `.ipa`).

4. If you see an error screen instead of a white screen, read the message and check device logs (Xcode → Window → Devices and Simulators → select device → Open Console, or `npx react-native log-ios` if connected).

---

## Summary of changes made for production stability

- **Entry point (`index.ts`):** App is loaded with a dynamic `import('./App')`. If loading fails (e.g. Supabase env missing), a fallback screen is shown and the error is logged.
- **App config (`app.config.js`):** Injects `EXPO_PUBLIC_*` into `extra` at build time so EAS builds get correct values when secrets are set.
- **Env template (`.env.example`):** Lists required `EXPO_PUBLIC_*` variables for local and EAS.
- **ErrorBoundary:** Always logs caught errors (including production) so they appear in device logs.
- **AuthContext:** Safe handling of `getSession()` result (`data?.session`).
- **authService:** DEBUG logs wrapped in `__DEV__`; redirect scheme uses `Constants.expoConfig?.scheme ?? 'values'`.
- **LoginScreen:** Optional chaining for `data?.session` when logging.
