-- LeadForge initial schema
-- Migration: 20260524000000_initial_schema
-- Run via: supabase db push  OR  psql -f this_file
--
-- NOTE: Apply RLS policies (commented out at bottom) BEFORE going to production.

-- ─────────────────────────────────────────────────────────────────────────────
-- User Profiles
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists user_profiles (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null unique references auth.users (id) on delete cascade,
  company_name  text        not null default '',
  website_url   text        not null default '',   -- Required for draft generation
  services      text[]      not null default '{}',
  regions       text[]      not null default '{}',
  min_budget    integer,
  max_budget    integer,
  case_snippets text        not null default '',
  locale        text        not null default 'zh-CN',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Lead Sources
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists lead_sources (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users (id) on delete cascade,
  name              text        not null,
  source_type       text        not null check (source_type in ('csv_import','manual','public_source','mock_adapter')),
  url               text,
  collection_method text        not null check (collection_method in ('manual_copy','csv_import','rss','public_api')),
  tos_note          text,
  risk_level        text        not null default 'low' check (risk_level in ('low','medium','high')),
  enabled           boolean     not null default true,
  created_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Leads
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists leads (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users (id) on delete cascade,
  source_id          uuid        references lead_sources (id) on delete set null,
  title              text        not null,
  description        text        not null default '',
  source_url         text,
  budget_text        text,
  location           text,
  industry           text,
  published_at       timestamptz,
  status             text        not null default 'new'
                                  check (status in ('new','reviewed','approved','draft_created','sent','replied','won','lost','ignored','blacklisted')),
  compliance_status  text        not null default 'pending'
                                  check (compliance_status in ('pending','cleared','blocked')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Lead Scores
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists lead_scores (
  id             uuid        primary key default gen_random_uuid(),
  lead_id        uuid        not null unique references leads (id) on delete cascade,
  overall_score  numeric(4,1) not null,
  service_match  numeric(4,1) not null default 0,
  budget_fit     numeric(4,1) not null default 0,
  urgency        numeric(4,1) not null default 0,
  geography_fit  numeric(4,1) not null default 0,
  risk_penalty   numeric(4,1) not null default 0,
  explanation    text        not null default '',
  model_version  text        not null default 'heuristic-v1',
  scored_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Outreach Drafts
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists outreach_drafts (
  id            uuid        primary key default gen_random_uuid(),
  lead_id       uuid        not null references leads (id) on delete cascade,
  subject       text        not null,
  body          text        not null,
  status        text        not null default 'draft' check (status in ('draft','copied','sent')),
  generated_at  timestamptz not null default now(),
  copied_at     timestamptz,
  sent_at       timestamptz
  -- No auto-send: all sending is manual-confirm only
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Suppression Entries (opt-outs and blacklists)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists suppression_entries (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  type        text        not null check (type in ('domain','email','source')),
  value       text        not null,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (user_id, type, value)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Lead Notes
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists lead_notes (
  id          uuid        primary key default gen_random_uuid(),
  lead_id     uuid        not null references leads (id) on delete cascade,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  note        text        not null,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit Events (append-only compliance log)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists audit_events (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  lead_id     uuid        references leads (id) on delete set null,
  event_type  text        not null
                           check (event_type in ('lead_imported','lead_approved','lead_ignored','draft_generated','draft_copied','status_changed','blacklisted')),
  payload     jsonb,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists leads_user_id_status_idx     on leads            (user_id, status);
create index if not exists leads_user_id_created_at_idx on leads            (user_id, created_at desc);
create index if not exists lead_scores_lead_id_idx      on lead_scores      (lead_id);
create index if not exists outreach_drafts_lead_id_idx  on outreach_drafts  (lead_id);
create index if not exists audit_events_user_id_idx     on audit_events     (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security (enable BEFORE production deployment)
-- ─────────────────────────────────────────────────────────────────────────────
-- Uncomment these blocks after verifying your Supabase project is configured.
--
-- alter table user_profiles      enable row level security;
-- alter table lead_sources        enable row level security;
-- alter table leads               enable row level security;
-- alter table lead_scores         enable row level security;
-- alter table outreach_drafts     enable row level security;
-- alter table suppression_entries enable row level security;
-- alter table lead_notes          enable row level security;
-- alter table audit_events        enable row level security;
--
-- create policy "owner" on user_profiles      for all using (auth.uid() = user_id);
-- create policy "owner" on lead_sources        for all using (auth.uid() = user_id);
-- create policy "owner" on leads               for all using (auth.uid() = user_id);
-- create policy "owner" on lead_scores         for all using (
--   lead_id in (select id from leads where user_id = auth.uid()));
-- create policy "owner" on outreach_drafts     for all using (
--   lead_id in (select id from leads where user_id = auth.uid()));
-- create policy "owner" on suppression_entries for all using (auth.uid() = user_id);
-- create policy "owner" on lead_notes          for all using (auth.uid() = user_id);
-- create policy "owner" on audit_events        for all using (auth.uid() = user_id);
