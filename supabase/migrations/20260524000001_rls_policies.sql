-- LeadForge RLS Policies
-- Migration: 20260524000001_rls_policies
--
-- Activates Row-Level Security on all 8 tables.
-- Every user can only read and write their own data.
-- The Supabase service role automatically bypasses RLS — no extra policy needed.
--
-- Run AFTER the initial schema migration:
--   supabase db push   OR   psql -f 20260524000001_rls_policies.sql
--
-- To verify:
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' ORDER BY tablename;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS on all tables
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_drafts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events        ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- user_profiles — direct user_id ownership
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "user_profiles_owner" ON user_profiles
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- lead_sources — direct user_id ownership
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "lead_sources_owner" ON lead_sources
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- leads — direct user_id ownership
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "leads_owner" ON leads
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- lead_scores — indirect: belongs to a lead owned by the user
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "lead_scores_owner" ON lead_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_scores.lead_id
        AND leads.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_scores.lead_id
        AND leads.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- outreach_drafts — indirect: belongs to a lead owned by the user
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "outreach_drafts_owner" ON outreach_drafts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = outreach_drafts.lead_id
        AND leads.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = outreach_drafts.lead_id
        AND leads.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- suppression_entries — direct user_id ownership
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "suppression_entries_owner" ON suppression_entries
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- lead_notes — direct user_id ownership
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "lead_notes_owner" ON lead_notes
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_events — direct user_id ownership
-- audit_events are append-only; UPDATE and DELETE are intentionally blocked
-- for authenticated users to preserve the compliance log integrity.
-- The service role can still delete rows (e.g. during account deletion).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "audit_events_select" ON audit_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "audit_events_insert" ON audit_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policy for authenticated users — append-only enforcement.
-- Service role bypasses RLS and can delete rows as part of account deletion.
