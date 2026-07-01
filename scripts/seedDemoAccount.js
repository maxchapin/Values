#!/usr/bin/env node
/**
 * seedDemoAccount.js
 *
 * Creates (or refreshes) a fully-onboarded demo account for Apple App Review,
 * plus a second synthetic account it's already matched and chatting with —
 * so a reviewer signing in sees a populated app instead of an empty Discover
 * feed / fresh onboarding flow.
 *
 * Safe to re-run: looks up existing accounts by email instead of recreating them.
 *
 * Usage:
 *   node scripts/seedDemoAccount.js
 *   node scripts/seedDemoAccount.js --email appreview@example.com --password "SomeStrongPass1!"
 *
 * Setup: see scripts/README.md
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Service-role key is required: auth.admin.createUser and writing other users'
// profiles/swipes bypasses RLS, which the anon key cannot do.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '\nError: Missing Supabase credentials.\n' +
      '  Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n' +
      '  in your .env file and try again.\n'
  );
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--email') args.email = argv[++i];
    else if (argv[i] === '--password') args.password = argv[++i];
  }
  return args;
}

const cliArgs = parseArgs(process.argv.slice(2));

const DEMO_EMAIL = cliArgs.email || process.env.DEMO_ACCOUNT_EMAIL || 'appreview@thelocaldating.com';
const DEMO_PASSWORD = cliArgs.password || process.env.DEMO_ACCOUNT_PASSWORD || 'AppReview2026!';
// Second account exists purely so the demo account has a match + conversation to show.
const COMPANION_EMAIL = process.env.DEMO_COMPANION_EMAIL || 'appreview-match@thelocaldating.com';
const COMPANION_PASSWORD = process.env.DEMO_COMPANION_PASSWORD || 'AppReview2026Companion!';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create the auth user if it doesn't exist yet; otherwise return the existing id. */
async function ensureAuthUser(supabase, email, password) {
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      isOnboardingComplete: true,
      isProfileComplete: true,
      isValuesComplete: true,
    },
  });

  if (!createErr && created?.user) {
    console.log(`  created auth user ${email} (${created.user.id})`);
    return created.user.id;
  }

  // Already exists — look it up via the profiles row the signup trigger created.
  const { data: existing, error: lookupErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (lookupErr || !existing) {
    throw new Error(
      `Could not create or find auth user for ${email}: ${createErr?.message || lookupErr?.message}`
    );
  }

  console.log(`  reusing existing auth user ${email} (${existing.id})`);
  return existing.id;
}

async function upsertFullProfile(supabase, id, profile) {
  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: profile.firstName,
      display_name: profile.firstName,
      birthday: profile.birthday,
      gender: profile.gender,
      bio: profile.bio,
      hometown: profile.hometown,
      location_label: profile.locationLabel,
      location_latitude: profile.lat,
      location_longitude: profile.lng,
      photos: profile.photos,
      prompts: profile.prompts,
      selected_values: profile.selectedValueIds,
      values_profile: {
        selectedValueIds: profile.selectedValueIds,
        selectedValues: profile.selectedValueIds.map((id2, i) => ({
          id: id2,
          label: profile.valueLabels[i],
        })),
      },
      preferences: { interested_in: profile.interestedIn },
      is_profile_complete: true,
      is_values_complete: true,
      is_onboarding_complete: true,
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update profile ${id}: ${error.message}`);
  }
  console.log(`  profile updated for ${profile.firstName} (${id})`);
}

async function ensureMutualLike(supabase, idA, idB) {
  const { error } = await supabase
    .from('profile_swipes')
    .upsert(
      [
        { viewer_id: idA, target_id: idB, direction: 'like' },
        { viewer_id: idB, target_id: idA, direction: 'like' },
      ],
      { onConflict: 'viewer_id,target_id', ignoreDuplicates: true }
    );

  if (error) {
    throw new Error(`Failed to record mutual like: ${error.message}`);
  }

  const userA = idA < idB ? idA : idB;
  const userB = idA < idB ? idB : idA;
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('id')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .single();

  if (matchErr || !match) {
    throw new Error(`Mutual like did not create a match row: ${matchErr?.message}`);
  }

  console.log(`  match confirmed (${match.id})`);
  return match.id;
}

async function ensureConversation(supabase, matchId, demoId, companionId) {
  const { data: existing, error: existingErr } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('match_id', matchId)
    .limit(1);

  if (existingErr) {
    throw new Error(`Failed to check existing chat messages: ${existingErr.message}`);
  }
  if (existing && existing.length > 0) {
    console.log('  conversation already seeded, skipping');
    return;
  }

  const messages = [
    { sender_id: companionId, content: "Hey! Saw we both picked 'personal growth' as a core value — love that." },
    { sender_id: demoId, content: 'Hi! Yeah, it’s been a big focus for me this year. What does that look like for you?' },
    { sender_id: companionId, content: 'Mostly reading and therapy, honestly. Also trying to hike more on weekends.' },
  ];

  const { error } = await supabase.from('chat_messages').insert(
    messages.map((m) => ({ match_id: matchId, message_type: 'text', ...m }))
  );

  if (error) {
    throw new Error(`Failed to insert chat messages: ${error.message}`);
  }
  console.log('  conversation seeded (3 messages)');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('\nEnsuring demo account...');
  const demoId = await ensureAuthUser(supabase, DEMO_EMAIL, DEMO_PASSWORD);
  await upsertFullProfile(supabase, demoId, {
    firstName: 'Alex',
    birthday: '1995-04-12',
    gender: 'man',
    bio: 'App Store reviewer demo account. Enjoys coffee, hiking, and reading.',
    hometown: 'Boston, MA',
    locationLabel: 'Boston, MA',
    lat: 42.3601,
    lng: -71.0589,
    photos: ['https://i.pravatar.cc/600?img=12'],
    prompts: [{ id: 'p1', question: 'A perfect Sunday looks like', answer: 'Farmers market, a long walk, then a good book.', isCustom: false }],
    selectedValueIds: ['adventure', 'honesty', 'personal-growth'],
    valueLabels: ['Adventure', 'Honesty', 'Personal Growth'],
    interestedIn: 'everyone',
  });

  console.log('\nEnsuring companion (match) account...');
  const companionId = await ensureAuthUser(supabase, COMPANION_EMAIL, COMPANION_PASSWORD);
  await upsertFullProfile(supabase, companionId, {
    firstName: 'Jordan',
    birthday: '1996-09-03',
    gender: 'woman',
    bio: 'Coffee enthusiast, always up for a hike or a new restaurant.',
    hometown: 'Cambridge, MA',
    locationLabel: 'Cambridge, MA',
    lat: 42.3776,
    lng: -71.0996,
    photos: ['https://i.pravatar.cc/600?img=47'],
    prompts: [{ id: 'p1', question: 'My go-to weekend plan', answer: 'New coffee shop, then a hike if the weather holds.', isCustom: false }],
    selectedValueIds: ['adventure', 'honesty', 'personal-growth', 'connection', 'health'],
    valueLabels: ['Adventure', 'Honesty', 'Personal Growth', 'Connection', 'Health'],
    interestedIn: 'everyone',
  });

  console.log('\nEnsuring mutual match...');
  const matchId = await ensureMutualLike(supabase, demoId, companionId);

  console.log('\nSeeding conversation...');
  await ensureConversation(supabase, matchId, demoId, companionId);

  console.log('\n✓ Demo account ready. Give Apple App Review these credentials:\n');
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}\n`);
}

main().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
