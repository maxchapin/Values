#!/usr/bin/env node
/**
 * review-moderation-flags.js
 *
 * List pending automated abuse-signal flags (moderation_flags table —
 * written by DB triggers for block-evasion and GPS-mismatch patterns),
 * or mark one reviewed/dismissed/actioned.
 *
 * Usage:
 *   node scripts/review-moderation-flags.js
 *   node scripts/review-moderation-flags.js --resolve <flag_id> --status reviewed
 *
 * Setup: see scripts/README.md
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Service-role key is required — moderation_flags has no SELECT policy at
// all (RLS-enabled, writes only via SECURITY DEFINER functions), so the
// anon key can't read it under any circumstance.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const VALID_STATUSES = ['pending', 'reviewed', 'dismissed', 'actioned'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '\nError: Missing Supabase credentials.\n' +
      '  Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n' +
      '  in your .env file and try again.\n'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { resolve: undefined, status: undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--resolve') args.resolve = argv[++i];
    else if (argv[i] === '--status') args.status = argv[++i];
  }
  return args;
}

// ---------------------------------------------------------------------------
// List mode
// ---------------------------------------------------------------------------

async function listPending(supabase) {
  const { data: flags, error } = await supabase
    .from('moderation_flags')
    .select('id, created_at, flagged_user_id, reason, metadata')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch moderation flags:', error.message);
    process.exit(1);
  }

  if (!flags || flags.length === 0) {
    console.log('\nNo pending moderation flags.\n');
    return;
  }

  const userIds = new Set(flags.map((f) => f.flagged_user_id));

  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', [...userIds]);

  if (profileErr) {
    console.error('Failed to fetch profiles:', profileErr.message);
    process.exit(1);
  }

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? p.id]));

  console.log(`\n${flags.length} pending moderation flag(s):\n`);
  for (const f of flags) {
    console.log(`id:        ${f.id}`);
    console.log(`created:   ${f.created_at}`);
    console.log(`user:      ${nameById.get(f.flagged_user_id) ?? f.flagged_user_id}`);
    console.log(`reason:    ${f.reason}`);
    if (f.metadata) console.log(`metadata:  ${JSON.stringify(f.metadata)}`);
    console.log('');
  }

  console.log('Resolve one with: node scripts/review-moderation-flags.js --resolve <id> --status reviewed\n');
}

// ---------------------------------------------------------------------------
// Resolve mode
// ---------------------------------------------------------------------------

async function resolveFlag(supabase, flagId, status) {
  if (!VALID_STATUSES.includes(status)) {
    console.error(`\nError: --status must be one of: ${VALID_STATUSES.join(', ')}\n`);
    process.exit(1);
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('moderation_flags')
    .select('status')
    .eq('id', flagId)
    .single();

  if (fetchErr || !existing) {
    console.error(`\nError: flag ${flagId} not found.\n`);
    process.exit(1);
  }

  const { error: updateErr } = await supabase
    .from('moderation_flags')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', flagId);

  if (updateErr) {
    console.error('Failed to update flag:', updateErr.message);
    process.exit(1);
  }

  console.log(`\n✓  Flag ${flagId}: ${existing.status} → ${status}\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const args = parseArgs(process.argv.slice(2));

  if (args.resolve && !args.status) {
    console.error('\nError: --resolve requires --status <pending|reviewed|dismissed|actioned>\n');
    process.exit(1);
  }
  if (args.status && !args.resolve) {
    console.error('\nError: --status requires --resolve <flag_id>\n');
    process.exit(1);
  }

  if (args.resolve && args.status) {
    await resolveFlag(supabase, args.resolve, args.status);
  } else {
    await listPending(supabase);
  }
}

main().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
