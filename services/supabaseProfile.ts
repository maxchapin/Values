/**
 * Supabase Profile Service
 * Handles user profile creation and updates in Supabase database
 * 
 * SECURITY: All operations use RLS policies to ensure users can only access their own data
 */

import { supabase } from './supabase';
import type { AuthUser } from '../types/auth';
import type { User } from '../types/user';

export interface SupabaseProfile {
  id: string; // Matches auth.users.id
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  auth_provider: 'google' | 'apple' | 'phone';
  age: number | null;
  gender: string | null;
  bio: string | null;
  location_label: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  hometown: string | null;
  job: string | null;
  education: string | null;
  photos: string[] | null; // Array of photo URLs
  prompts: Array<{ id: string; question: string; answer: string; isCustom: boolean }> | null;
  selected_values: string[] | null;
  is_profile_complete: boolean;
  is_values_complete: boolean;
  is_onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
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
  const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !supabaseUser) {
    throw new Error(`Authentication required: ${authError?.message || 'No user found'}`);
  }

  // Ensure we're creating/updating the correct user's profile
  if (supabaseUser.id !== authUser.id) {
    throw new Error('User ID mismatch - cannot create profile for different user');
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
      age: userData.age || null,
      gender: userData.gender || null,
      bio: userData.bio || null,
      location_label: userData.locationLabel || null,
      location_latitude: userData.locationCoordinates?.latitude || null,
      location_longitude: userData.locationCoordinates?.longitude || null,
      hometown: userData.hometown || null,
      job: userData.job || null,
      education: userData.education || null,
      photos: userData.photos && userData.photos.length > 0 ? userData.photos : null,
      prompts: userData.prompts && userData.prompts.length > 0 ? userData.prompts : null,
      selected_values: userData.selectedValues && userData.selectedValues.length > 0 ? userData.selectedValues : null,
      is_profile_complete: !!userData.age && !!userData.gender && !!userData.bio && (userData.photos?.length || 0) > 0,
      is_values_complete: (userData.selectedValues?.length || 0) >= 5,
      is_onboarding_complete: false, // Will be computed
    }),
    updated_at: new Date().toISOString(),
  };

  // Compute onboarding completion
  if (userData) {
    profileData.is_onboarding_complete = 
      !!profileData.is_profile_complete && 
      !!profileData.is_values_complete;
  }

  // Upsert profile (insert or update)
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData, {
      onConflict: 'id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[supabaseProfile] Error upserting profile:', error);
    throw new Error(`Failed to save profile: ${error.message}`);
  }

  if (!data) {
    throw new Error('Profile upsert returned no data');
  }

  return data as SupabaseProfile;
}

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

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile doesn't exist yet
      return null;
    }
    console.error('[supabaseProfile] Error fetching profile:', error);
    return null;
  }

  return data as SupabaseProfile;
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
