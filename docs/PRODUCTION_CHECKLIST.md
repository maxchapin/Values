# Production checklist

## Supabase migrations (order)

Apply SQL in `supabase/migrations` in numeric order through **012** (and any later files):

1. Core profile, storage, chat, preferences, etc.
2. **010** – `profile_swipes`, `matches`, mutual-match trigger, RLS.
3. **011** – Discover read policy on `profiles` for authenticated users.
4. **012** – `chat_messages.match_id` as UUID FK to `matches` (truncates `chat_messages`; see file header).

Confirm RLS in the dashboard for `profiles`, `profile_swipes`, `matches`, `chat_messages`, and storage.

## Secrets (EAS / env)

- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- OAuth client IDs and redirect URLs for **release** bundle IDs

## Account deletion

`deleteSupabaseProfile` removes the user’s **matches**, **profile_swipes**, then **profiles** row. Chat rows for those matches are removed by FK `ON DELETE CASCADE` once **012** is applied. Full account removal may also require deleting the **auth user** (e.g. Edge Function or dashboard) per your policy.
