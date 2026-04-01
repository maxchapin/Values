-- Full tiered values selection (values cloud) as JSONB.
-- App shape (TypeScript UserValuesProfile):
-- {
--   "allValues": [ { "id": string, "label": string, "tier": "none"|"initial"|"top20"|"top10"|"top5" }, ... ],
--   "top5Ids": string[],
--   "top10Ids": string[],
--   "top20Ids": string[],
--   "initialIds": string[]
-- }
-- Keep `selected_values` for backward compatibility (e.g. top-5 id list for simple queries);
-- the app can mirror top5Ids into selected_values on save if desired.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS values_profile JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.values_profile IS
  'Full values cloud state: allValues with per-value tiers plus top5/top10/top20/initial id lists. Mirrors UserValuesProfile in the app.';

-- Optional index if you query inside JSON (e.g. by top5 id); usually not needed for row-by-id fetches.
-- CREATE INDEX IF NOT EXISTS idx_profiles_values_profile ON public.profiles USING gin (values_profile);

-- Backfill: copy existing selected_values into id lists only (allValues left absent/null).
-- Client can treat missing allValues as "rebuild from INITIAL_VALUES + top5Ids" until users re-save from the app.
UPDATE public.profiles
SET values_profile = jsonb_strip_nulls(
  jsonb_build_object(
    'top5Ids', selected_values,
    'top10Ids', selected_values,
    'top20Ids', selected_values,
    'initialIds', selected_values
  )
)
WHERE values_profile IS NULL
  AND selected_values IS NOT NULL
  AND jsonb_typeof(selected_values) = 'array'
  AND jsonb_array_length(selected_values) > 0;
