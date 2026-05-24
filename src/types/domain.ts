// Domain types derived from the Supabase Database schema.
// Row types are sourced from database.ts so they stay in sync when
// `supabase gen types` regenerates that file.

import type { Database } from './database'

// ─── Row types ────────────────────────────────────────────────────────────────

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type LeadSource = Database['public']['Tables']['lead_sources']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type LeadScore = Database['public']['Tables']['lead_scores']['Row']
export type OutreachDraft = Database['public']['Tables']['outreach_drafts']['Row']
export type SuppressionEntry = Database['public']['Tables']['suppression_entries']['Row']
export type LeadNote = Database['public']['Tables']['lead_notes']['Row']
export type AuditEvent = Database['public']['Tables']['audit_events']['Row']

// ─── Extracted enum types ─────────────────────────────────────────────────────

export type LeadStatus = Lead['status']
export type ComplianceStatus = Lead['compliance_status']
export type DraftStatus = OutreachDraft['status']
export type SuppressionType = SuppressionEntry['type']
export type SourceType = LeadSource['source_type']
export type CollectionMethod = LeadSource['collection_method']
export type RiskLevel = LeadSource['risk_level']
export type AuditEventType = AuditEvent['event_type']

// ─── Insert / Update convenience types ───────────────────────────────────────

export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
export type AuditEventInsert = Database['public']['Tables']['audit_events']['Insert']
