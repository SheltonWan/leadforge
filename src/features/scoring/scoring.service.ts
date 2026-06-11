import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { LeadScore } from '@/types/domain'
import type { ScoringAdapter } from '@/adapters/scoring/scoring-adapter.interface'
import { HeuristicScoringAdapter } from '@/adapters/scoring/heuristic-scoring.adapter'
import { getProfile } from '@/features/profile/profile.repository'
import { upsertLeadScore } from './scoring.repository'

type SupabaseDb = SupabaseClient<Database, 'public'>

// Default adapter — swap for a real AI adapter when an API key is available.
const defaultAdapter: ScoringAdapter = new HeuristicScoringAdapter()

/**
 * Score a lead against the user's service profile.
 * Fetches the user profile, runs the scoring adapter, and persists the result.
 *
 * @param supabase  Authenticated Supabase client
 * @param userId    Owner's user ID
 * @param leadId    The lead to score
 * @param riskLevel Optional risk level from the associated lead_source record
 * @param adapter   Scoring adapter (defaults to HeuristicScoringAdapter)
 */
export async function scoreLead(
  supabase: SupabaseDb,
  userId: string,
  leadId: string,
  riskLevel?: 'low' | 'medium' | 'high',
  adapter: ScoringAdapter = defaultAdapter,
): Promise<LeadScore> {
  // Fetch the lead row
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('user_id', userId)
    .single()

  if (leadError) throw leadError
  if (!lead) throw new Error(`Lead ${leadId} not found`)

  // Fetch (or fall back to default) user profile for scoring context
  const profile = await getProfile(supabase, userId)
  const safeProfile = profile ?? {
    id: '',
    user_id: userId,
    company_name: '',
    website_url: '',
    services: [],
    regions: [],
    min_budget: null,
    max_budget: null,
    case_snippets: '',
    locale: 'zh-CN',
    zbj_username: null,
    zbj_password_enc: null,
    created_at: '',
    updated_at: '',
  }

  const result = await adapter.score({
    lead: { ...lead, risk_level: riskLevel },
    profile: safeProfile,
  })

  return upsertLeadScore(supabase, leadId, result)
}
