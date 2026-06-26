#!/usr/bin/env node
/**
 * review-reports.js
 *
 * List pending user reports, or mark one reviewed/dismissed/actioned.
 *
 * Usage:
 *   node scripts/review-reports.js
 *   node scripts/review-reports.js --resolve <report_id> --status reviewed
 *
 * Setup: see scripts/README.md
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Service-role key is required (not optional) — RLS restricts user_reports
// SELECT to the reporter's own rows, so the anon key can't list other users'
// reports.
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
  const { data: reports, error } = await supabase
    .from('user_reports')
    .select('id, created_at, reason, details, reporter_id, reported_user_id, match_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch reports:', error.message);
    process.exit(1);
  }

  if (!reports || reports.length === 0) {
    console.log('\nNo pending reports.\n');
    return;
  }

  const userIds = new Set();
  for (const r of reports) {
    userIds.add(r.reporter_id);
    userIds.add(r.reported_user_id);
  }

  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', [...userIds]);

  if (profileErr) {
    console.error('Failed to fetch profiles:', profileErr.message);
    process.exit(1);
  }

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? p.id]));

  console.log(`\n${reports.length} pending report(s):\n`);
  for (const r of reports) {
    console.log(`id:        ${r.id}`);
    console.log(`created:   ${r.created_at}`);
    console.log(`reporter:  ${nameById.get(r.reporter_id) ?? r.reporter_id}`);
    console.log(`reported:  ${nameById.get(r.reported_user_id) ?? r.reported_user_id}`);
    console.log(`reason:    ${r.reason}`);
    if (r.details) console.log(`details:   ${r.details}`);
    if (r.match_id) console.log(`match_id:  ${r.match_id}`);
    console.log('');
  }

  console.log('Resolve one with: node scripts/review-reports.js --resolve <id> --status reviewed\n');
}

// ---------------------------------------------------------------------------
// Resolve mode
// ---------------------------------------------------------------------------

async function resolveReport(supabase, reportId, status) {
  if (!VALID_STATUSES.includes(status)) {
    console.error(`\nError: --status must be one of: ${VALID_STATUSES.join(', ')}\n`);
    process.exit(1);
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('user_reports')
    .select('status')
    .eq('id', reportId)
    .single();

  if (fetchErr || !existing) {
    console.error(`\nError: report ${reportId} not found.\n`);
    process.exit(1);
  }

  const { error: updateErr } = await supabase
    .from('user_reports')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', reportId);

  if (updateErr) {
    console.error('Failed to update report:', updateErr.message);
    process.exit(1);
  }

  console.log(`\n✓  Report ${reportId}: ${existing.status} → ${status}\n`);
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
    console.error('\nError: --status requires --resolve <report_id>\n');
    process.exit(1);
  }

  if (args.resolve && args.status) {
    await resolveReport(supabase, args.resolve, args.status);
  } else {
    await listPending(supabase);
  }
}

main().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
