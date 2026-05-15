#!/usr/bin/env node
/**
 * generate-qr-codes.js
 *
 * Fetches all venues from Supabase and produces:
 *   qr-codes/<venue-slug>.png   — one QR PNG per venue
 *   qr-codes/all-venues.pdf     — print-ready PDF, one venue per page
 *
 * Usage:  node scripts/generate-qr-codes.js
 * Setup:  see scripts/README.md
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Prefer service-role key (bypasses RLS); fall back to anon key.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Website base URL — QR codes point to https://<SITE_URL>/checkin?token=<qr_token>
const SITE_URL = (process.env.CHECKIN_SITE_URL ?? 'https://yourdomain.com').replace(/\/$/, '');

const OUT_DIR = path.resolve(__dirname, '..', 'qr-codes');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '\nError: Missing Supabase credentials.\n' +
      '  Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY)\n' +
      '  in your .env file and try again.\n'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function checkinUrl(qrToken) {
  return `${SITE_URL}/checkin?token=${qrToken}`;
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

async function generatePdf(entries, pdfPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const PAGE_W = doc.page.width;   // 595.28 pt
    const PAGE_H = doc.page.height;  // 841.89 pt
    const MARGIN = 60;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const QR_SIZE = 300;

    entries.forEach(({ venue, buffer }, i) => {
      if (i > 0) doc.addPage();

      // Venue name — top of page
      doc
        .font('Helvetica-Bold')
        .fontSize(26)
        .fillColor('#111111')
        .text(venue.name, MARGIN, MARGIN, { width: CONTENT_W, align: 'center' });

      // QR code — centered on the page
      const qrX = (PAGE_W - QR_SIZE) / 2;
      const qrY = (PAGE_H - QR_SIZE) / 2 - 16;
      doc.image(buffer, qrX, qrY, { width: QR_SIZE, height: QR_SIZE });

      // Tagline — just below the QR code
      doc
        .font('Helvetica')
        .fontSize(15)
        .fillColor('#555555')
        .text('Scan to meet people here', MARGIN, qrY + QR_SIZE + 18, {
          width: CONTENT_W,
          align: 'center',
        });
    });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('Fetching venues from Supabase...');
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, name, qr_token')
    .order('name');

  if (error) {
    console.error('Failed to fetch venues:', error.message);
    process.exit(1);
  }

  if (!venues || venues.length === 0) {
    console.log(
      '\nNo venues found in the database.\n' +
        'Add at least one venue row (with a unique qr_token), then re-run this script.\n'
    );
    process.exit(0);
  }

  console.log(`Found ${venues.length} venue(s). Generating QR codes...\n`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Generate one PNG per venue and collect buffers for the PDF pass.
  const entries = [];
  for (const venue of venues) {
    const url = checkinUrl(venue.qr_token);
    const slug = slugify(venue.name);
    const pngPath = path.join(OUT_DIR, `${slug}.png`);

    const buffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 800,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    fs.writeFileSync(pngPath, buffer);
    entries.push({ venue, buffer, pngPath });
    console.log(`  ✓  ${slug}.png`);
    console.log(`     ${url}\n`);
  }

  // Generate the combined PDF.
  const pdfPath = path.join(OUT_DIR, 'all-venues.pdf');
  await generatePdf(entries, pdfPath);

  console.log(`✓  PDF: all-venues.pdf`);
  console.log(`\nAll files written to: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
