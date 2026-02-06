# Production Integration Guide

This guide shows how to integrate Supabase profile creation after Google OAuth login.

## Step 1: Run Supabase Migrations

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Run `supabase/migrations/001_profiles_table.sql`
5. Run `supabase/migrations/002_storage_buckets.sql`

## Step 2: Integrate Profile Creation

Update `contexts/AuthContext.tsx` to create profile after Google login:

```typescript
import { upsertSupabaseProfile } from '../services/supabaseProfile';

// In the onAuthStateChange listener, after setting user:
if (event === 'SIGNED_IN' && session?.user) {
  // ... existing code ...
  
  // Create/update profile in Supabase
  try {
    await upsertSupabaseProfile(authUser);
    if (__DEV__) {
      console.log('[AuthContext] ✅ Profile created in Supabase');
    }
  } catch (error) {
    // Log but don't fail auth - profile can be created later
    if (__DEV__) {
      console.error('[AuthContext] Error creating profile:', error);
    }
  }
}
```

## Step 3: Update Profile on Onboarding Completion

Update `hooks/useValuesCompletionSync.ts` to sync to Supabase:

```typescript
import { updateProfileCompletion } from '../services/supabaseProfile';

// After values completion:
await updateProfileCompletion(isProfileComplete, isValuesComplete);
```

## Step 4: Test the Flow

1. Sign in with Google
2. Check Supabase Dashboard → Table Editor → `profiles` table
3. Verify profile was created with your user ID
4. Complete onboarding
5. Verify profile completion flags updated

## Optional: Use Supabase Storage for Images

Update image upload to use Supabase Storage:

```typescript
import { supabase } from '../services/supabase';

async function uploadAvatar(imageUri: string, userId: string): Promise<string> {
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const fileName = `${userId}/${Date.now()}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);
  
  return publicUrl;
}
```
