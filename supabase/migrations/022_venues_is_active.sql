-- ================================================================
-- Migration 022: Venue lifecycle — is_active flag
--   - Lets venue admins retire a venue / rotated-out QR code without
--     deleting history. New check-ins against an inactive venue are
--     rejected by the checkin edge function (HTTP 410).
--   - get_checkin_feed is intentionally NOT filtered on is_active —
--     existing overlaps from a deactivated venue can still surface
--     within their 7-day window.
-- Run AFTER 021_checkin_abuse_signals.sql
-- ================================================================

ALTER TABLE venues ADD COLUMN is_active boolean NOT NULL DEFAULT true;
