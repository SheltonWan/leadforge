import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { LeadScore } from '@/types/domain'
import type { ScoreResult } from '@/adapters/scoring/scoring-adapter.interface'

type SupabaseDb = SupabaseClient<Database, 'public'>

export async function upsertLeadScore(
  supabase: SupabaseDb,
  leadId: string,
  result: ScoreResult,
): Promise<LeadScore> {
  const { data, error } = await supabase
    .from('lead_scores')
    .upsert(
      {
        lead_id: leadId,
        overall_score: result.overall_score,
        service_match: result.factors.service_match,
        budget_fit: result.factors.budget_fit,
        urgency: result.factors.urgency,
        geography_fit: result.factors.geography_fit,
        risk_penalty: result.factors.risk_penalty,
        explanation: result.explanation,
        model_version: result.model_version,
        scored_at: new Date().toISOString(),
      },
      { onConflict: 'lead_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getLeadScore(
  supabase: SupabaseDb,
  leadId: string,
): Promise<LeadScore | null> {
  const { data, error } = await supabase
    .from('lead_scores')
    .select('*')
    .eq('lead_id', leadId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}
