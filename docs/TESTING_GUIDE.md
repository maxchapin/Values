# Testing Guide - Post-Migration Verification

After running the Supabase migrations, use this guide to verify everything works.

## ✅ Step 1: Verify Database Setup

1. **Check Profiles Table**
   - Go to Supabase Dashboard → Table Editor → `profiles`
   - Verify table exists with all columns
   - Verify RLS is enabled (should see "RLS enabled" badge)

2. **Check Storage Buckets**
   - Go to Supabase Dashboard → Storage → Buckets
   - Verify `avatars` bucket exists
   - Verify it's set to "Public"

## ✅ Step 2: Test Google Login Flow

1. **Clear App Data** (to test fresh login)
   - Delete and reinstall app, OR
   - Sign out if already logged in

2. **Sign In with Google**
   - Tap "Continue with Google"
   - Complete Google OAuth flow
   - App should redirect back

3. **Verify Profile Creation**
   - Go to Supabase Dashboard → Table Editor → `profiles`
   - Find your user ID (from `auth.users` table)
   - Verify profile row exists with:
     - `id` matches your user ID
     - `email` populated
     - `auth_provider` = 'google'
     - `is_profile_complete` = false
     - `is_values_complete` = false
     - `is_onboarding_complete` = false

4. **Check Console Logs**
   - Look for: `[AuthContext] ✅ Profile created/updated in Supabase`
   - If you see: `⚠️ Profile creation failed` - check error message

## ✅ Step 3: Test RLS Policies

1. **Try to Access Another User's Profile** (should fail)
   - In Supabase Dashboard → SQL Editor, run:
   ```sql
   -- This should return empty (RLS blocks it)
   SELECT * FROM profiles WHERE id != auth.uid();
   ```

2. **Verify You Can Only See Your Own Profile**
   - In SQL Editor, run:
   ```sql
   -- This should return your profile only
   SELECT * FROM profiles;
   ```

## ✅ Step 4: Test Profile Updates

1. **Complete Profile Setup**
   - Fill out profile form
   - Submit profile

2. **Verify Profile Updated in Supabase**
   - Check `profiles` table
   - Verify `is_profile_complete` = true
   - Verify profile fields populated (age, gender, bio, etc.)

3. **Complete Values Onboarding**
   - Go through values selection
   - Complete onboarding

4. **Verify Values Updated**
   - Check `profiles` table
   - Verify `is_values_complete` = true
   - Verify `selected_values` array populated
   - Verify `is_onboarding_complete` = true

## ✅ Step 5: Test Storage (Optional)

1. **Upload Profile Photo**
   - Go to profile setup or edit profile
   - Upload a photo

2. **Verify Photo in Storage**
   - Go to Supabase Dashboard → Storage → `avatars` bucket
   - Verify photo uploaded to `{userId}/` folder
   - Verify public URL works

## ✅ Step 6: Test Session Persistence

1. **Close App Completely**
   - Force close the app

2. **Reopen App**
   - App should restore session
   - Should navigate directly to main app (if onboarding complete)
   - OR to onboarding (if incomplete)

3. **Verify Session in Supabase**
   - Check `auth.sessions` table (if accessible)
   - Or verify user still authenticated in app

## 🐛 Troubleshooting

### Profile Not Created After Login

**Symptoms:**
- Google login works
- No profile row in `profiles` table
- Console shows: `⚠️ Profile creation failed`

**Solutions:**
1. Check Supabase logs: Dashboard → Logs → Postgres Logs
2. Verify RLS policies are active
3. Check if trigger `on_auth_user_created` exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
4. Manually create profile (one-time fix):
   ```sql
   INSERT INTO profiles (id, email, auth_provider)
   VALUES (auth.uid(), auth.email(), 'google');
   ```

### RLS Blocking Profile Access

**Symptoms:**
- Profile creation fails with "permission denied"
- Cannot read own profile

**Solutions:**
1. Verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'profiles';
   ```
2. Verify policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```
3. Re-run migration if policies missing

### Storage Upload Fails

**Symptoms:**
- Image upload fails
- Error: "new row violates row-level security policy"

**Solutions:**
1. Verify storage policies exist:
   ```sql
   SELECT * FROM storage.policies WHERE bucket_id = 'avatars';
   ```
2. Re-run `002_storage_buckets.sql` if policies missing
3. Verify bucket is public: Storage → Buckets → avatars → Public = true

---

## ✅ Success Criteria

Your setup is working correctly if:

- ✅ Google login creates profile in `profiles` table
- ✅ Profile updates sync to Supabase
- ✅ RLS prevents accessing other users' profiles
- ✅ Session persists across app restarts
- ✅ Onboarding completion flags update correctly

---

**Next Steps:**
- Test with multiple users (create test accounts)
- Monitor Supabase logs for errors
- Test edge cases (network failures, etc.)
