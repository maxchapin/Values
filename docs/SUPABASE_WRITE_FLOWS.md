# Supabase write flows (logged-in user)

Quick reference for where profile/values/preferences hit Postgres or Storage. Use Expo Go with `__DEV__` to see `[supabaseProfile]`, `[ProfileSetupScreen]`, `[EditProfileScreen]`, `[ValuesOnboarding]`, `[Settings]`, and `[supabaseProfilePhotos]` logs.

## Checklist

| Flow | Where it runs | Primary API |
|------|----------------|-------------|
| Stub profile after sign-in (auth row, best-effort) | `AuthContext` — `onAuthStateChange` / `persistAuth` | `upsertSupabaseProfile(authUser)` (fire-and-forget; dev logs only) |
| Initial profile + photos after onboarding form | `ProfileSetupScreen` → `onSubmit` | `createOrUpdateUser` (local) → `upsertSupabaseProfile` → `refreshProfile` |
| Edit profile (name, bio, gender, interested-in, location, prompts, photos) | `EditProfileScreen` → `handleSave` | `updateProfile` → `upsertSupabaseProfile` → `refreshProfile` |
| Values (onboarding + Profile/Discover entry) | `ValuesOnboardingScreen` → `handleComplete` | `updateValuesProfile` → `upsertSupabaseProfile` → `refreshProfile` |
| Profile photos | Inside `upsertSupabaseProfile` | `resolveProfilePhotoUrlsForSupabase` → Storage `avatars` bucket |
| Settings (visibility + notification prefs JSONB) | `SettingsScreen` | `updateSettings` → `updateSupabasePreferences` |
| Last active for Discover | `AuthContext` after sign-in / session | `touchLastLoginAt` (also set on full profile upsert) |

## Schema targets

- **Table:** `profiles` — columns mapped in `services/supabaseProfile.ts` (`SupabaseProfile`), including `photos` (text[]), `prompts` (jsonb), `selected_values` (text[]), `preferences` (jsonb: `interested_in`, visibility, push flags).
- **Storage:** bucket `avatars`, object path `{userId}/profile-{slot}-{timestamp}.{ext}` — `services/supabaseProfilePhotos.ts`.

## Examples (patterns)

**Profile upsert (insert/update row + optional photo upload):**

```ts
await upsertSupabaseProfile(authUser, partialUserFromStore);
await refreshProfile(); // repopulate UserStore + UI from Supabase (e.g. public photo URLs)
```

**Preferences JSONB patch (merge, does not wipe `interested_in`):**

```ts
await updateSupabasePreferences({
  is_profile_visible: true,
  push_new_match: true,
  push_new_message: true,
});
```

**Storage upload (called from upsert when `photos` contain local URIs):**

```ts
await supabase.storage.from('avatars').upload(path, blob, { contentType, upsert: true });
// then `getPublicUrl` → stored in `profiles.photos`
```

## Error handling

- **Profile setup / values complete:** failure shows `Alert` and **does not** advance the flow (where returning early applies).
- **Edit profile:** local `updateProfile` always runs; cloud sync errors show `Alert` with the error message; `refreshProfile` runs only after successful upsert.
- **Settings:** local store updates first; Supabase sync failures show `Alert` without reverting the toggle (preference remains on device).
