/**
 * Supabase Profile Service
 * Handles user profile creation and updates in Supabase database
 * 
 * SECURITY: All operations use RLS policies to ensure users can only access their own data
 */

import { supabase } from './supabase';
import { calculateAge } from '../utils/dateUtils';
import type { AuthUser } from '../types/auth';
import type { User, UserValuesProfile } from '../types/user';
import type { ProfileGender, InterestedIn } from '../types/user';
import type { ValueTier } from '../types/value';
import { INITIAL_VALUES } from '../data/valuesConstants';
import {
  normalizeProfilePhotoUri,
  resolveProfilePhotoUrlsForSupabase,
  removeOrphanProfileAvatarObjects,
} from './supabaseProfilePhotos';

/** Gender values stored in Supabase `profiles.gender` (matches Profile type). */
export type { ProfileGender } from '../types/user';

export interface SupabaseProfile {
  id: string; // Matches auth.users.id
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  auth_provider: 'google' | 'apple' | 'phone';
  age: number | null;
  /** Date of birth (ISO); used to compute age when present. */
  birthday: string | null;
  gender: ProfileGender;
  bio: string | null;
  location_label: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  neighborhood: string | null;
  hometown: string | null;
  job: string | null;
  education: string | null;
  photos: string[] | null; // Array of photo URLs
  prompts: Array<{ id: string; question: string; answer: string; isCustom: boolean }> | null;
  selected_values: string[] | null;
  /** Full values cloud JSON (`UserValuesProfile`); see migration 009. */
  values_profile: unknown | null;
  is_profile_complete: boolean;
  is_values_complete: boolean;
  is_onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
  /** Last app open / sign-in; used for Discover composite score (similarity + recency). */
  last_login_at: string | null;
  /** Notification toggles, visibility, dating preference (interested_in). */
  preferences: SupabasePreferences | null;
}

/** Lean discovery select: only columns needed for cards + match scoring. Avoid select('*') for memory. */
const DISCOVERY_SELECT =
  'id, first_name, age, gender, photos, bio, location_label, location_latitude, location_longitude, neighborhood, hometown, job, education, prompts, selected_values, values_profile, is_profile_complete, is_values_complete, created_at, updated_at, last_login_at';

/** Map app User.gender to Supabase profiles.gender. */
function userGenderToProfileGender(g: User['gender']): ProfileGender {
  if (!g) return null;
  if (g === 'male') return 'man';
  if (g === 'female') return 'woman';
  if (g === 'non-binary') return 'nonbinary';
  return null; // 'prefer-not-to-say' -> null in DB
}

/** Coerce JSONB `photos` to displayable URIs (https public URLs or local schemes). */
function normalizeProfilePhotosFromRow(photos: string[] | null | undefined): string[] {
  if (!Array.isArray(photos)) return [];
  const out: string[] = [];
  for (const p of photos) {
    if (typeof p !== 'string') continue;
    const n = normalizeProfilePhotoUri(p);
    if (n) out.push(n);
  }
  return out;
}

/**
 * Rebuild `UserValuesProfile` from Supabase `selected_values` only (no `values_profile`).
 * Used as fallback when `values_profile` is missing or invalid. Tiers beyond top 5 are not recoverable.
 */
export function buildValuesProfileFromSelectedValues(
  selected_values: string[] | null | undefined
): UserValuesProfile {
  const ids = Array.isArray(selected_values)
    ? selected_values.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];
  const top5Ids = ids.slice(0, 5);
  const top5Set = new Set(top5Ids);

  const allValues = INITIAL_VALUES.map((v) => ({
    ...v,
    tier: (top5Set.has(v.id) ? 'top5' : 'none') as ValueTier,
  }));

  return {
    allValues,
    top5Ids,
    top10Ids: top5Ids,
    top20Ids: top5Ids,
    initialIds: top5Ids,
  };
}

const VALID_VALUE_TIERS = new Set<ValueTier>(['none', 'initial', 'top20', 'top10', 'top5']);

function parseStoredIdList(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function coerceValueTier(raw: unknown): ValueTier | null {
  if (typeof raw !== 'string') return null;
  const t = raw as ValueTier;
  return VALID_VALUE_TIERS.has(t) ? t : null;
}

/** Same ordering rules as `ValuesOnboardingScreen` when building id lists from tiered values. */
function deriveIdListsFromAllValues(
  allValues: Array<{ id: string; tier: ValueTier }>
): Pick<UserValuesProfile, 'top5Ids' | 'top10Ids' | 'top20Ids' | 'initialIds'> {
  const top5Ids = allValues.filter((v) => v.tier === 'top5').map((v) => v.id);
  const top10Ids = allValues
    .filter((v) => v.tier === 'top10' || v.tier === 'top5')
    .map((v) => v.id);
  const top20Ids = allValues
    .filter((v) => v.tier === 'top20' || v.tier === 'top10' || v.tier === 'top5')
    .map((v) => v.id);
  const initialIds = allValues.filter((v) => v.tier !== 'none').map((v) => v.id);
  return { top5Ids, top10Ids, top20Ids, initialIds };
}

function buildValuesProfileFromIdLists(
  top5Ids: string[],
  top10Ids: string[],
  top20Ids: string[],
  initialIds: string[]
): UserValuesProfile {
  const top5 = new Set(top5Ids);
  const top10 = new Set(top10Ids);
  const top20 = new Set(top20Ids);
  const initial = new Set(initialIds);

  const tierForId = (id: string): ValueTier => {
    if (top5.has(id)) return 'top5';
    if (top10.has(id)) return 'top10';
    if (top20.has(id)) return 'top20';
    if (initial.has(id)) return 'initial';
    return 'none';
  };

  const allValues = INITIAL_VALUES.map((v) => ({
    ...v,
    tier: tierForId(v.id),
  }));

  return {
    allValues,
    top5Ids,
    top10Ids,
    top20Ids,
    initialIds,
  };
}

/**
 * Parse `profiles.values_profile` JSONB into `UserValuesProfile`.
 * Handles full documents, partial backfill (id lists only), and invalid data (returns null).
 */
export function userValuesProfileFromRow(
  values_profile: unknown,
  selected_values: string[] | null | undefined
): UserValuesProfile | null {
  if (values_profile == null) return null;
  if (typeof values_profile !== 'object' || Array.isArray(values_profile)) return null;

  const raw = values_profile as Record<string, unknown>;
  let top5Ids = parseStoredIdList(raw.top5Ids);
  let top10Ids = parseStoredIdList(raw.top10Ids);
  let top20Ids = parseStoredIdList(raw.top20Ids);
  let initialIds = parseStoredIdList(raw.initialIds);

  const sel = Array.isArray(selected_values)
    ? selected_values.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];
  if (top5Ids.length === 0 && sel.length > 0) {
    top5Ids = sel.slice(0, 5);
  }

  const avRaw = raw.allValues;
  if (Array.isArray(avRaw) && avRaw.length > 0) {
    const tierById = new Map<string, ValueTier>();
    for (const item of avRaw) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : null;
      if (!id) continue;
      const tier = coerceValueTier(o.tier) ?? 'none';
      tierById.set(id, tier);
    }
    if (tierById.size === 0) {
      if (top5Ids.length === 0 && top10Ids.length === 0 && top20Ids.length === 0 && initialIds.length === 0) {
        return null;
      }
      return buildValuesProfileFromIdLists(top5Ids, top10Ids, top20Ids, initialIds);
    }

    const allValues = INITIAL_VALUES.map((v) => ({
      id: v.id,
      label: v.label,
      tier: tierById.get(v.id) ?? ('none' as ValueTier),
    }));

    const derived = deriveIdListsFromAllValues(allValues);
    const lists =
      top5Ids.length > 0 || top10Ids.length > 0 || top20Ids.length > 0 || initialIds.length > 0
        ? { top5Ids, top10Ids, top20Ids, initialIds }
        : derived;

    return {
      allValues,
      top5Ids: lists.top5Ids,
      top10Ids: lists.top10Ids,
      top20Ids: lists.top20Ids,
      initialIds: lists.initialIds,
    };
  }

  if (top5Ids.length === 0 && top10Ids.length === 0 && top20Ids.length === 0 && initialIds.length === 0) {
    return null;
  }

  return buildValuesProfileFromIdLists(top5Ids, top10Ids, top20Ids, initialIds);
}

/** Serialize `UserValuesProfile` for JSONB `values_profile` (plain JSON only). */
export function userValuesProfileToJson(profile: UserValuesProfile): Record<string, unknown> {
  return {
    allValues: profile.allValues.map((v) => ({
      id: v.id,
      label: v.label,
      tier: v.tier,
    })),
    top5Ids: [...profile.top5Ids],
    top10Ids: [...profile.top10Ids],
    top20Ids: [...profile.top20Ids],
    initialIds: [...profile.initialIds],
  };
}

/** Map Supabase profiles.gender to app User.gender (for building User from discovery rows). */
export function profileGenderToUserGender(g: ProfileGender | null | undefined): User['gender'] {
  if (!g) return 'prefer-not-to-say';
  if (g === 'man') return 'male';
  if (g === 'woman') return 'female';
  if (g === 'nonbinary') return 'non-binary';
  return 'prefer-not-to-say';
}

/** Build app User from Supabase profile row (e.g. for AuthContext → UserStore sync after login). */
export function supabaseProfileToUser(profile: SupabaseProfile): User {
  const parsedValues = userValuesProfileFromRow(profile.values_profile, profile.selected_values);
  const selectedValues =
    parsedValues && parsedValues.top5Ids.length > 0
      ? parsedValues.top5Ids
      : (profile.selected_values ?? []);
  const age =
    profile.birthday != null
      ? calculateAge(profile.birthday)
      : (profile.age ?? 0);
  return {
    id: profile.id,
    email: profile.email ?? '',
    name: profile.first_name ?? profile.display_name ?? 'User',
    age,
    birthday: profile.birthday ?? undefined,
    gender: profileGenderToUserGender(profile.gender),
    bio: profile.bio ?? '',
    photos: normalizeProfilePhotosFromRow(profile.photos),
    prompts: Array.isArray(profile.prompts) ? profile.prompts : [],
    selectedValues,
    locationCoordinates:
      profile.location_latitude != null && profile.location_longitude != null
        ? { latitude: profile.location_latitude, longitude: profile.location_longitude }
        : null,
    locationLabel: profile.location_label ?? null,
    neighborhood: profile.neighborhood ?? undefined,
    hometown: profile.hometown ?? undefined,
    job: profile.job ?? undefined,
    education: profile.education ?? undefined,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    lastLoginAt: profile.last_login_at ?? undefined,
    interestedIn: (profile.preferences?.interested_in as InterestedIn | undefined) ?? undefined,
    settings: profile.preferences
      ? {
          isProfileVisible: profile.preferences.is_profile_visible !== false,
          notifications: {
            newMatch: profile.preferences.push_new_match !== false,
            newMessage: profile.preferences.push_new_message !== false,
          },
        }
      : undefined,
    valuesProfile:
      parsedValues ?? buildValuesProfileFromSelectedValues(profile.selected_values),
  };
}

/**
 * Ensure we have a valid session before making authenticated requests.
 * Refreshes the session from storage and returns the current user.
 */
async function ensureSession(): Promise<{ user: { id: string }; error: Error | null }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (__DEV__) {
    console.log('[supabaseProfile] Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      sessionError: sessionError?.message ?? null,
    });
  }
  if (session?.user) {
    return { user: session.user, error: null };
  }
  const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
  if (__DEV__) {
    console.log('[supabaseProfile] After refreshSession:', {
      hasSession: !!refreshed,
      userId: refreshed?.user?.id,
      refreshError: refreshError?.message ?? null,
    });
  }
  if (refreshed?.user) {
    return { user: refreshed.user, error: null };
  }
  const msg = refreshError?.message || sessionError?.message || 'Auth session missing!';
  return { user: null as any, error: new Error(msg) };
}

/**
 * Create or update user profile in Supabase after Google/Apple/Phone login
 * This is called automatically after successful authentication
 * 
 * SECURITY: Uses RLS policies - user can only create/update their own profile
 */
export async function upsertSupabaseProfile(
  authUser: AuthUser,
  userData?: Partial<User>
): Promise<SupabaseProfile> {
  const { user: supabaseUser, error: authError } = await ensureSession();

  if (authError || !supabaseUser) {
    throw new Error(`Authentication required: ${authError?.message || 'Auth session missing!'}`);
  }

  // Ensure we're creating/updating the correct user's profile
  if (supabaseUser.id !== authUser.id) {
    throw new Error('User ID mismatch - cannot create profile for different user');
  }

  let existingProfile: SupabaseProfile | null = null;
  if (
    userData &&
    ((userData.photos && userData.photos.length > 0) || userData.interestedIn != null)
  ) {
    existingProfile = await getSupabaseProfileByUserId(authUser.id);
  }

  let photosForRow: string[] | null | undefined =
    userData?.photos && userData.photos.length > 0 ? [...userData.photos] : undefined;
  let orphanStoragePaths: string[] = [];

  if (photosForRow && photosForRow.length > 0) {
    try {
      if (__DEV__) {
        console.log('[supabaseProfile] Resolving profile photos (diff vs server; upload new locals only)...', {
          desiredCount: photosForRow.length,
          previousCount: existingProfile?.photos?.length ?? 0,
        });
      }
      const resolved = await resolveProfilePhotoUrlsForSupabase(
        photosForRow,
        authUser.id,
        existingProfile?.photos ?? []
      );
      orphanStoragePaths = resolved.orphanStoragePaths;
      photosForRow = resolved.urls.filter((u) => typeof u === 'string' && u.trim().length > 0);
      if (photosForRow.length === 0) {
        photosForRow = undefined;
      }
    } catch (uploadErr) {
      const msg = uploadErr instanceof Error ? uploadErr.message : 'Photo upload failed';
      if (__DEV__) {
        console.error('[supabaseProfile] Photo upload error:', uploadErr);
      }
      throw new Error(msg);
    }
  }

  let mergedPreferences: SupabasePreferences | undefined;
  if (userData && userData.interestedIn != null) {
    const prev =
      existingProfile?.preferences && typeof existingProfile.preferences === 'object'
        ? { ...(existingProfile.preferences as SupabasePreferences) }
        : {};
    mergedPreferences = { ...prev, interested_in: userData.interestedIn };
    if (__DEV__) {
      console.log('[supabaseProfile] Merged preferences.interested_in for upsert');
    }
  }

  // Prepare profile data
  const profileData: Partial<SupabaseProfile> = {
    id: authUser.id,
    email: authUser.email || null,
    display_name: authUser.displayName || null,
    first_name: authUser.firstName || null,
    last_name: authUser.lastName || null,
    photo_url: authUser.photoUrl || null,
    auth_provider: authUser.authProvider,
    // Merge with existing user data if provided
    ...(userData && {
      ...(userData.name != null && String(userData.name).trim() !== ''
        ? { first_name: String(userData.name).trim() }
        : {}),
      age: userData.age ?? null,
      birthday: userData.birthday ?? null,
      gender: userData.gender ? userGenderToProfileGender(userData.gender) : null,
      bio: userData.bio || null,
      location_label: userData.locationLabel || null,
      location_latitude: userData.locationCoordinates?.latitude || null,
      location_longitude: userData.locationCoordinates?.longitude || null,
      neighborhood: userData.neighborhood ?? null,
      hometown: userData.hometown || null,
      job: userData.job || null,
      education: userData.education || null,
      photos: photosForRow && photosForRow.length > 0 ? photosForRow : null,
      prompts: userData.prompts && userData.prompts.length > 0 ? userData.prompts : null,
      ...(userData.valuesProfile
        ? {
            values_profile: userValuesProfileToJson(userData.valuesProfile),
            selected_values:
              userData.valuesProfile.top5Ids.length > 0
                ? userData.valuesProfile.top5Ids
                : null,
          }
        : {
            selected_values:
              userData.selectedValues && userData.selectedValues.length > 0
                ? userData.selectedValues
                : null,
          }),
      is_profile_complete:
        (!!userData.birthday || !!userData.age) &&
        !!userData.gender &&
        !!userData.bio &&
        ((photosForRow?.length ?? userData.photos?.length) || 0) > 0,
      is_values_complete:
        (userData.valuesProfile?.top5Ids?.length ?? userData.selectedValues?.length ?? 0) >= 5,
      is_onboarding_complete: false, // Will be computed
    }),
    ...(mergedPreferences !== undefined ? { preferences: mergedPreferences as SupabaseProfile['preferences'] } : {}),
    updated_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(), // So this user appears recently active in others' Discover
  };

  // Compute onboarding completion
  if (userData) {
    profileData.is_onboarding_complete =
      !!profileData.is_profile_complete && !!profileData.is_values_complete;
  }

  if (__DEV__) {
    console.log('[supabaseProfile] Upserting profiles row', {
      userId: authUser.id,
      hasUserPayload: !!userData,
      photoCount: Array.isArray(profileData.photos) ? profileData.photos.length : 0,
    });
  }

  // Upsert profile (insert or update). Explicit select to avoid select('*') and keep payload lean.
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData, {
      onConflict: 'id',
      ignoreDuplicates: false,
    })
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    console.error('[supabaseProfile] Error upserting profile:', error);
    throw new Error(`Failed to save profile: ${error.message}`);
  }

  if (!data) {
    throw new Error('Profile upsert returned no data');
  }

  if (__DEV__) {
    console.log('[supabaseProfile] Upsert OK', { userId: authUser.id });
  }

  if (orphanStoragePaths.length > 0) {
    await removeOrphanProfileAvatarObjects(orphanStoragePaths);
  }

  return data as SupabaseProfile;
}

/**
 * Update the current user's last_login_at to now.
 * Call on app open (session restore) and after sign-in so Discover composite score treats them as recently active.
 */
export async function touchLastLoginAt(): Promise<void> {
  const { user, error: authError } = await ensureSession();
  if (authError || !user) return;

  const { error } = await supabase
    .from('profiles')
    .update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    if (__DEV__) {
      console.warn('[supabaseProfile] touchLastLoginAt failed:', error.message);
    }
  } else if (__DEV__) {
    console.log('[supabaseProfile] touchLastLoginAt OK', user.id);
  }
}

const PROFILE_SELECT =
  'id, email, display_name, first_name, last_name, photo_url, auth_provider, age, birthday, gender, bio, location_label, location_latitude, location_longitude, neighborhood, hometown, job, education, photos, prompts, selected_values, values_profile, is_profile_complete, is_values_complete, is_onboarding_complete, created_at, updated_at, last_login_at, preferences';

/**
 * Get current user's profile from Supabase
 *
 * SECURITY: Uses RLS policies - user can only read their own profile
 */
export async function getSupabaseProfile(): Promise<SupabaseProfile | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  return getSupabaseProfileByUserId(user.id);
}

/**
 * Fetch profile row by user id (e.g. from session.user.id).
 * Use when you already have a session and want to avoid an extra getUser() call.
 * SECURITY: RLS ensures users can only read their own profile.
 */
export async function getSupabaseProfileByUserId(userId: string): Promise<SupabaseProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    if (__DEV__) {
      console.error('[supabaseProfile] Error fetching profile:', error);
    }
    return null;
  }

  return data as SupabaseProfile;
}

/**
 * Row shape returned when fetching profiles for Discover.
 * Includes gender for card display and for Interested In filtering.
 */
export interface DiscoveryProfileRow {
  id: string;
  first_name: string | null;
  age: number | null;
  gender: ProfileGender;
  photos: string[] | null;
  bio: string | null;
  location_label: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  neighborhood: string | null;
  hometown: string | null;
  job: string | null;
  education: string | null;
  prompts: Array<{ id: string; question: string; answer: string; isCustom: boolean }> | null;
  selected_values: string[] | null;
  values_profile: unknown | null;
  is_profile_complete: boolean;
  is_values_complete: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/** Map a discovery query row to app `User` (email not selected — use empty string). */
export function discoveryProfileRowToUser(row: DiscoveryProfileRow): User {
  const parsedValues = userValuesProfileFromRow(row.values_profile, row.selected_values);
  const selectedValues =
    parsedValues && parsedValues.top5Ids.length > 0
      ? parsedValues.top5Ids
      : (row.selected_values ?? []);
  const age = row.age ?? 0;
  return {
    id: row.id,
    email: '',
    name: row.first_name ?? 'User',
    age,
    gender: profileGenderToUserGender(row.gender),
    bio: row.bio ?? '',
    photos: normalizeProfilePhotosFromRow(row.photos),
    prompts: Array.isArray(row.prompts) ? row.prompts : [],
    selectedValues,
    locationCoordinates:
      row.location_latitude != null && row.location_longitude != null
        ? { latitude: row.location_latitude, longitude: row.location_longitude }
        : null,
    locationLabel: row.location_label ?? null,
    neighborhood: row.neighborhood ?? undefined,
    hometown: row.hometown ?? undefined,
    job: row.job ?? undefined,
    education: row.education ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at ?? undefined,
    valuesProfile:
      parsedValues ?? buildValuesProfileFromSelectedValues(row.selected_values),
  };
}

/**
 * Fetch profiles for the Discover screen.
 * Selects gender and last_login_at so the card can display it and composite ordering (similarity + recency) can be applied.
 * Excludes the viewer. Optionally filter by interestedIn (men -> gender=man, women -> gender=woman, everyone -> no filter).
 * When building Match[] from rows, set user.lastLoginAt = row.last_login_at and use getRecencyScore/getCompositeScore from mockBackend for ordering.
 * SECURITY: Depends on RLS allowing read of other users' profiles for discovery.
 */
export async function getDiscoveryProfiles(
  viewerId: string,
  options?: { interestedIn?: InterestedIn }
): Promise<DiscoveryProfileRow[]> {
  let query = supabase
    .from('profiles')
    .select(DISCOVERY_SELECT)
    .neq('id', viewerId);

  if (options?.interestedIn === 'men') {
    query = query.eq('gender', 'man');
  } else if (options?.interestedIn === 'women') {
    query = query.eq('gender', 'woman');
  }
  // 'everyone' or undefined: no gender filter

  const { data, error } = await query;

  if (error) {
    console.error('[supabaseProfile] Error fetching discovery profiles:', error);
    return [];
  }

  return (data ?? []) as DiscoveryProfileRow[];
}

/** Fetch discovery-shaped profile rows by id (e.g. mutual match partners). */
export async function getDiscoveryProfileRowsByIds(userIds: string[]): Promise<DiscoveryProfileRow[]> {
  const ids = [...new Set(userIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from('profiles').select(DISCOVERY_SELECT).in('id', ids);

  if (error) {
    if (__DEV__) {
      console.error('[supabaseProfile] Error fetching profiles by ids:', error);
    }
    return [];
  }

  return (data ?? []) as DiscoveryProfileRow[];
}

/**
 * Update profile completion flags
 * Called when user completes profile setup or values onboarding
 */
export async function updateProfileCompletion(
  isProfileComplete: boolean,
  isValuesComplete: boolean
): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_profile_complete: isProfileComplete,
      is_values_complete: isValuesComplete,
      is_onboarding_complete: isProfileComplete && isValuesComplete,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('[supabaseProfile] Error updating completion flags:', error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

/** Preferences shape stored in profiles.preferences (JSONB). */
export interface SupabasePreferences {
  is_profile_visible?: boolean;
  push_new_match?: boolean;
  push_new_message?: boolean;
  /** Mirrors app `User.interestedIn` — stored in JSONB (no dedicated column). */
  interested_in?: InterestedIn;
}

/**
 * Update only preferences for the current user in Supabase.
 * Called from Settings when user toggles notifications or profile visibility.
 */
export async function updateSupabasePreferences(preferences: SupabasePreferences): Promise<void> {
  const { user, error: authError } = await ensureSession();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  const existing = await getSupabaseProfileByUserId(user.id);
  const prev =
    existing?.preferences && typeof existing.preferences === 'object'
      ? { ...(existing.preferences as SupabasePreferences) }
      : {};
  const merged: SupabasePreferences = { ...prev, ...preferences };

  if (__DEV__) {
    console.log('[supabaseProfile] updateSupabasePreferences (merged patch)');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      preferences: merged,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('[supabaseProfile] Error updating preferences:', error);
    throw new Error(`Failed to update preferences: ${error.message}`);
  }
}

/**
 * Delete the current user's profile row in Supabase (for Delete Account).
 * Call before signOut so the session is still valid for RLS.
 */
export async function deleteSupabaseProfile(): Promise<void> {
  const { user, error: authError } = await ensureSession();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  const uid = user.id;
  // Matches first (chat_messages FK CASCADE). Then swipes. Then profile row.
  const { error: delMatchErr } = await supabase
    .from('matches')
    .delete()
    .or(`user_a.eq.${uid},user_b.eq.${uid}`);
  if (delMatchErr && __DEV__) {
    console.warn('[supabaseProfile] delete matches:', delMatchErr.message);
  }
  const { error: delSwipeErr } = await supabase
    .from('profile_swipes')
    .delete()
    .or(`viewer_id.eq.${uid},target_id.eq.${uid}`);
  if (delSwipeErr && __DEV__) {
    console.warn('[supabaseProfile] delete swipes:', delSwipeErr.message);
  }

  const { error } = await supabase.from('profiles').delete().eq('id', user.id);

  if (error) {
    console.error('[supabaseProfile] Error deleting profile:', error);
    throw new Error(`Failed to delete profile: ${error.message}`);
  }
}
