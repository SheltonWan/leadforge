import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type DB = SupabaseClient<Database>

export type DashboardMetrics = {
  total: number
  scored: number
  approved: number
  draftCreated: number
  sent: number
  replied: number
  won: number
  lost: number
  // Top leads by score for quick-access list
  topLeads: Array<{ id: string; title: string; overall_score: number }>
}

/** Aggregate lead counts by status for the dashboard. */
export async function getDashboardMetrics(
  supabase: DB,
  userId: string,
): Promise<DashboardMetrics> {
  // Fetch all leads with minimal fields + score in a single query
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, title, status, lead_scores(overall_score)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = leads ?? []

  let scored = 0
  let approved = 0
  let draftCreated = 0
  let sent = 0
  let replied = 0
  let won = 0
  let lost = 0

  const scoredLeads: Array<{ id: string; title: string; overall_score: number }> = []

  for (const row of rows) {
    const scoreVal = Array.isArray(row.lead_scores)
      ? (row.lead_scores[0] as { overall_score: number } | undefined)?.overall_score ?? null
      : (row.lead_scores as { overall_score: number } | null)?.overall_score ?? null

    if (scoreVal !== null) {
      scored++
      scoredLeads.push({ id: row.id, title: row.title, overall_score: scoreVal })
    }

    switch (row.status) {
      case 'approved': approved++; break
      case 'draft_created': draftCreated++; break
      case 'sent': sent++; break
      case 'replied': replied++; break
      case 'won': won++; break
      case 'lost': lost++; break
    }
  }

  // Top 5 by score
  const topLeads = scoredLeads
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, 5)

  return {
    total: rows.length,
    scored,
    approved,
    draftCreated,
    sent,
    replied,
    won,
    lost,
    topLeads,
  }
}
