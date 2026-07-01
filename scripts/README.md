# QR Code Generator

Generates a PNG and a combined print-ready PDF for every venue in the Supabase `venues` table.

To run it once you have venues: add SUPABASE_SERVICE_ROLE_KEY and CHECKIN_SITE_URL to your .env, install the three dev packages, then node scripts/generate-qr-codes.js.

## Output

```
qr-codes/
  bloc-11-cafe.png
  the-middle-east-restaurant-nightclub.png
  ...
  all-venues.pdf      ← one page per venue, ready to print
```

Each QR code encodes:

```
https://yourdomain.com/checkin?token=<qr_token>
```

---

## One-time setup

### 1. Install script dependencies

These packages are only needed locally and are not part of the app bundle.

```bash
npm install --save-dev qrcode pdfkit dotenv
```

### 2. Add your Supabase service-role key to `.env`

The service-role key bypasses row-level security so the script can read the `venues` table without needing a user session. Get it from **Supabase Dashboard → Project Settings → API → service_role secret**.

```
# Add to your existing .env file
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-here
```

`EXPO_PUBLIC_SUPABASE_URL` is already in `.env` — the script reuses it.

### 3. Set your website URL (optional)

By default QR codes point to `https://yourdomain.com/checkin?token=…`. Override this with:

```
CHECKIN_SITE_URL=https://yourrealdomain.com
```

---

## Running the script

```bash
node scripts/generate-qr-codes.js
```

The script is safe to re-run at any time — it overwrites existing PNGs and regenerates the PDF from scratch.

---

## Adding a new venue

1. Insert a row into the `venues` table in Supabase. The `qr_token` column must be a unique, URL-safe string. A good format:

   ```sql
   INSERT INTO venues (name, category, address, qr_token, lat, lng)
   VALUES (
     'Café Somewhere',
     'coffee',
     '123 Main St, Boston, MA',
     'venue_cafesomewhere_x9y8z7',   -- make this unique and random
     42.3601,
     -71.0589
   );
   ```

   For production tokens use a cryptographically random string, e.g.:
   ```bash
   node -e "console.log('venue_' + require('crypto').randomBytes(8).toString('hex'))"
   ```

2. Re-run the script:
   ```bash
   node scripts/generate-qr-codes.js
   ```

3. Print the new page from `qr-codes/all-venues.pdf` or the individual PNG and place it at the venue.

---

## Notes

- `qr-codes/` is git-ignored (add it to `.gitignore` if not already present) — regenerate from source rather than committing binaries.
- Error correction level is set to **H** (30 %), so the QR code remains scannable even if partially obscured by a sticker or logo.
- The anon key works if your Supabase RLS policy allows public reads on `venues`; the service-role key always works regardless of RLS.

---

# Report Review

Lists pending user reports (from the in-app Report flow) and lets you mark them reviewed, dismissed, or actioned. You'll also get a push notification on your own device the instant a report is submitted (see migration `028_report_status_and_notify_trigger.sql` and `supabase/functions/notify-new-report/`) — this script is for actually triaging them afterward.

## Setup

Uses the same `SUPABASE_SERVICE_ROLE_KEY` as the QR script above. The service-role key is required here (not optional) — Row Level Security restricts `user_reports` reads to the reporter's own rows, so the anon key can't list other users' reports.

## Usage

List all pending reports:

```bash
node scripts/review-reports.js
```

Mark a report resolved (status must be one of `pending`, `reviewed`, `dismissed`, `actioned`):

```bash
node scripts/review-reports.js --resolve <report_id> --status reviewed
```

---

# Apple App Review Demo Account

Creates (or refreshes) a fully-onboarded demo account — complete profile, a mutual match, and a sample conversation — so Apple App Review can sign in and see a populated app immediately, without needing a real Google/Apple account or going through onboarding. The app has no public sign-up flow for email/password; this is the only way such an account gets created.

## Setup

Uses the same `SUPABASE_SERVICE_ROLE_KEY` as the scripts above. Also requires the **Email** provider to be enabled in **Supabase Dashboard → Authentication → Providers** (off by default in some projects).

## Usage

```bash
node scripts/seedDemoAccount.js
```

Optionally override the generated credentials:

```bash
node scripts/seedDemoAccount.js --email appreview@thelocaldating.com --password "SomeStrongPass1!"
```

(or set `DEMO_ACCOUNT_EMAIL` / `DEMO_ACCOUNT_PASSWORD` in `.env`). The script is safe to re-run — it looks up existing accounts by email instead of recreating them, and skips re-seeding the conversation if messages already exist.

When it finishes, it prints the credentials to paste into **App Store Connect → App Review Information → Sign-In Information**.
