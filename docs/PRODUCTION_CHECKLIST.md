# 🚀 Production Launch Checklist

Use this checklist before deploying to TestFlight/App Store.

## ✅ Security Checklist

- [x] **Environment Variables**
  - [x] `.env` is in `.gitignore`
  - [x] `.env.example` template created
  - [x] No hardcoded secrets in code
  - [ ] Production `.env` file created with real values

- [x] **Supabase Configuration**
  - [x] Client uses `process.env` only
  - [x] No hardcoded URLs in `app.json`
  - [x] Redirect URL uses env var template
  - [ ] Production Supabase project created
  - [ ] Production env vars set

- [x] **Row Level Security**
  - [x] RLS policies created (`001_profiles_table.sql`)
  - [ ] RLS migrations run in Supabase Dashboard
  - [ ] RLS verified (test: try to access another user's profile)

- [x] **Console Logging**
  - [x] All sensitive logs wrapped in `__DEV__`
  - [x] No email addresses logged
  - [x] No tokens logged in production

- [x] **Input Validation**
  - [x] Form validation present
  - [x] No SQL injection vectors (using Supabase client)

## ✅ Supabase Setup

- [ ] **Database**
  - [ ] Run `supabase/migrations/001_profiles_table.sql`
  - [ ] Verify `profiles` table exists
  - [ ] Verify RLS is enabled
  - [ ] Test profile creation

- [ ] **Storage**
  - [ ] Run `supabase/migrations/002_storage_buckets.sql`
  - [ ] Verify `avatars` bucket exists
  - [ ] Test image upload
  - [ ] Verify public URLs work

- [ ] **Authentication**
  - [ ] Google OAuth provider enabled
  - [ ] Redirect URLs configured:
    - `exp://**` (for Expo Go)
    - `values://auth/callback` (production)
    - `values://**` (wildcard)
  - [ ] Site URL set to production Supabase URL

## ✅ Expo Production Build

- [x] **Configuration**
  - [x] `scheme: "values"` set in `app.json`
  - [x] Bundle identifiers configured
  - [x] No tunnel URLs hardcoded

- [ ] **Build**
  - [ ] Run `eas build --platform ios`
  - [ ] Test build on TestFlight
  - [ ] Verify deep linking works
  - [ ] Verify OAuth redirect works

## ✅ Testing

- [ ] **Authentication Flow**
  - [ ] Google login works
  - [ ] Session persists on app restart
  - [ ] Sign out works
  - [ ] Error handling works (network failures)

- [ ] **Profile Creation**
  - [ ] Profile created in Supabase after Google login
  - [ ] Profile data syncs correctly
  - [ ] Image upload works (if using Supabase Storage)

- [ ] **Onboarding**
  - [ ] Profile setup completes
  - [ ] Values onboarding completes
  - [ ] Navigation to main app works

- [ ] **Security Testing**
  - [ ] Cannot access other users' profiles (RLS test)
  - [ ] Cannot upload to other users' storage folders
  - [ ] Session expires correctly

## ✅ Pre-Launch

- [ ] **Code Review**
  - [ ] No hardcoded secrets
  - [ ] All TODOs resolved
  - [ ] Error handling comprehensive
  - [ ] Loading states proper

- [ ] **Documentation**
  - [ ] README updated
  - [ ] Setup instructions clear
  - [ ] Environment variables documented

- [ ] **Monitoring**
  - [ ] Error tracking set up (optional)
  - [ ] Analytics configured (optional)
  - [ ] Crash reporting enabled (optional)

---

## 🎯 Quick Start Commands

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with production values

# 2. Run Supabase migrations
# In Supabase Dashboard → SQL Editor:
# - Run 001_profiles_table.sql
# - Run 002_storage_buckets.sql

# 3. Build for production
eas build --platform ios --profile production

# 4. Test on TestFlight
# Upload build to App Store Connect
# Test with beta testers
```

---

**Status:** Ready for TestFlight after completing Supabase migrations and environment setup.
