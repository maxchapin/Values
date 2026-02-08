/**
 * Re-export the single global Supabase client from lib/supabase.
 * Use this import everywhere so the same client (with AsyncStorage session) is used.
 */

export { supabase } from '../lib/supabase';
