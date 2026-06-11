// Generated-style Supabase Database type map for LeadForge.
// Replace with: supabase gen types typescript --project-id <id> > src/types/database.ts
// Keep aligned with supabase/migrations/ SQL files.

export type Database = {
  public: {
    Tables: {
      // ── User Profiles ─────────────────────────────────────────────────────
      user_profiles: {
        Row: {
          id: string
          user_id: string
          company_name: string
          website_url: string
          services: string[]
          regions: string[]
          min_budget: number | null
          max_budget: number | null
          case_snippets: string
          locale: string
          zbj_username: string | null
          zbj_password_enc: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name?: string
          website_url?: string
          services?: string[]
          regions?: string[]
          min_budget?: number | null
          max_budget?: number | null
          case_snippets?: string
          locale?: string
          zbj_username?: string | null
          zbj_password_enc?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          website_url?: string
          services?: string[]
          regions?: string[]
          min_budget?: number | null
          max_budget?: number | null
          case_snippets?: string
          locale?: string
          zbj_username?: string | null
          zbj_password_enc?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      // ── Lead Sources ──────────────────────────────────────────────────────
      lead_sources: {
        Row: {
          id: string
          user_id: string
          name: string
          source_type: 'csv_import' | 'manual' | 'public_source' | 'mock_adapter' | 'web_scraper'
          url: string | null
          collection_method: 'manual_copy' | 'csv_import' | 'rss' | 'public_api' | 'web_scraper'
          tos_note: string | null
          risk_level: 'low' | 'medium' | 'high'
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          source_type: 'csv_import' | 'manual' | 'public_source' | 'mock_adapter' | 'web_scraper'
          url?: string | null
          collection_method: 'manual_copy' | 'csv_import' | 'rss' | 'public_api' | 'web_scraper'
          tos_note?: string | null
          risk_level?: 'low' | 'medium' | 'high'
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          source_type?: 'csv_import' | 'manual' | 'public_source' | 'mock_adapter' | 'web_scraper'
          url?: string | null
          collection_method?: 'manual_copy' | 'csv_import' | 'rss' | 'public_api' | 'web_scraper'
          tos_note?: string | null
          risk_level?: 'low' | 'medium' | 'high'
          enabled?: boolean
        }
        Relationships: []
      }

      // ── Leads ─────────────────────────────────────────────────────────────
      leads: {
        Row: {
          id: string
          user_id: string
          source_id: string | null
          title: string
          description: string
          source_url: string | null
          budget_text: string | null
          location: string | null
          industry: string | null
          published_at: string | null
          status:
            | 'new'
            | 'reviewed'
            | 'approved'
            | 'draft_created'
            | 'sent'
            | 'replied'
            | 'won'
            | 'lost'
            | 'ignored'
            | 'blacklisted'
          compliance_status: 'pending' | 'cleared' | 'blocked'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_id?: string | null
          title: string
          description?: string
          source_url?: string | null
          budget_text?: string | null
          location?: string | null
          industry?: string | null
          published_at?: string | null
          status?:
            | 'new'
            | 'reviewed'
            | 'approved'
            | 'draft_created'
            | 'sent'
            | 'replied'
            | 'won'
            | 'lost'
            | 'ignored'
            | 'blacklisted'
          compliance_status?: 'pending' | 'cleared' | 'blocked'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_id?: string | null
          title?: string
          description?: string
          source_url?: string | null
          budget_text?: string | null
          location?: string | null
          industry?: string | null
          published_at?: string | null
          status?:
            | 'new'
            | 'reviewed'
            | 'approved'
            | 'draft_created'
            | 'sent'
            | 'replied'
            | 'won'
            | 'lost'
            | 'ignored'
            | 'blacklisted'
          compliance_status?: 'pending' | 'cleared' | 'blocked'
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_source_id_fkey'
            columns: ['source_id']
            isOneToOne: false
            referencedRelation: 'lead_sources'
            referencedColumns: ['id']
          },
        ]
      }

      // ── Lead Scores ───────────────────────────────────────────────────────
      lead_scores: {
        Row: {
          id: string
          lead_id: string
          overall_score: number
          service_match: number
          budget_fit: number
          urgency: number
          geography_fit: number
          risk_penalty: number
          explanation: string
          model_version: string
          scored_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          overall_score: number
          service_match?: number
          budget_fit?: number
          urgency?: number
          geography_fit?: number
          risk_penalty?: number
          explanation?: string
          model_version?: string
          scored_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          overall_score?: number
          service_match?: number
          budget_fit?: number
          urgency?: number
          geography_fit?: number
          risk_penalty?: number
          explanation?: string
          model_version?: string
          scored_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lead_scores_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }

      // ── Outreach Drafts ───────────────────────────────────────────────────
      outreach_drafts: {
        Row: {
          id: string
          lead_id: string
          subject: string
          body: string
          status: 'draft' | 'copied' | 'sent'
          generated_at: string
          copied_at: string | null
          sent_at: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          subject: string
          body: string
          status?: 'draft' | 'copied' | 'sent'
          generated_at?: string
          copied_at?: string | null
          sent_at?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          subject?: string
          body?: string
          status?: 'draft' | 'copied' | 'sent'
          copied_at?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'outreach_drafts_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }

      // ── Suppression Entries ───────────────────────────────────────────────
      suppression_entries: {
        Row: {
          id: string
          user_id: string
          type: 'domain' | 'email' | 'source'
          value: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'domain' | 'email' | 'source'
          value: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'domain' | 'email' | 'source'
          value?: string
          reason?: string | null
        }
        Relationships: []
      }

      // ── Lead Notes ────────────────────────────────────────────────────────
      lead_notes: {
        Row: {
          id: string
          lead_id: string
          user_id: string
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          user_id: string
          note: string
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          user_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lead_notes_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }

      // ── Audit Events ──────────────────────────────────────────────────────
      audit_events: {
        Row: {
          id: string
          user_id: string
          lead_id: string | null
          event_type:
            | 'lead_imported'
            | 'lead_approved'
            | 'lead_ignored'
            | 'draft_generated'
            | 'draft_copied'
            | 'status_changed'
            | 'blacklisted'
          payload: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lead_id?: string | null
          event_type:
            | 'lead_imported'
            | 'lead_approved'
            | 'lead_ignored'
            | 'draft_generated'
            | 'draft_copied'
            | 'status_changed'
            | 'blacklisted'
          payload?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lead_id?: string | null
          event_type?:
            | 'lead_imported'
            | 'lead_approved'
            | 'lead_ignored'
            | 'draft_generated'
            | 'draft_copied'
            | 'status_changed'
            | 'blacklisted'
          payload?: Record<string, unknown> | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_events_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
