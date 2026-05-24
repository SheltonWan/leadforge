import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Lead, LeadSource, LeadScore, AuditEvent } from '@/types/domain'
import type { LeadCreateData } from './leads.types'

type SupabaseDb = SupabaseClient<Database, 'public'>

export type LeadWithSource = Lead & {
  lead_sources: { risk_level: 'low' | 'medium' | 'high'; source_type: string } | null
}

/** Full lead detail including joined source, score, and recent audit events. */
export type LeadDetail = Lead & {
  lead_sources: LeadSource | null
  lead_scores: LeadScore | null
  audit_events: AuditEvent[]
}

function extractSourceName(sourceUrl: string): string {
  if (!sourceUrl) return '手动录入'
  try {
    return new URL(sourceUrl).hostname
  } catch {
    return sourceUrl.slice(0, 50)
  }
}

export async function createLead(
  supabase: SupabaseDb,
  userId: string,
  data: LeadCreateData,
): Promise<Lead> {
  const sourceUrl = data.source_url || null

  // Auto-create a lead_source record for traceability
  const { data: source, error: sourceError } = await supabase
    .from('lead_sources')
    .insert({
      user_id: userId,
      name: extractSourceName(data.source_url),
      source_type: data.source_type,
      url: sourceUrl,
      collection_method: data.collection_method,
      tos_note: data.tos_note || null,
      risk_level: data.risk_level,
    })
    .select()
    .single()

  if (sourceError) throw sourceError

  // High-risk sources start as blocked; others start as pending
  const complianceStatus = data.risk_level === 'high' ? 'blocked' : 'pending'

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      user_id: userId,
      source_id: source.id,
      title: data.title,
      description: data.description,
      source_url: sourceUrl,
      budget_text: data.budget_text || null,
      location: data.location || null,
      industry: data.industry || null,
      published_at: data.published_at ?? null,
      compliance_status: complianceStatus,
    })
    .select()
    .single()

  if (leadError) throw leadError
  return lead
}

export async function getLeads(
  supabase: SupabaseDb,
  userId: string,
  opts: {
    limit?: number
    offset?: number
    status?: string
    risk?: string
    search?: string
  } = {},
): Promise<{ leads: LeadWithSource[]; total: number }> {
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  let query = supabase
    .from('leads')
    .select('*, lead_sources(risk_level, source_type)', { count: 'exact' })
    .eq('user_id', userId)

  if (opts.status && opts.status !== 'all') {
    query = query.eq(
      'status',
      opts.status as Database['public']['Tables']['leads']['Row']['status'],
    )
  }
  if (opts.search) {
    query = query.ilike('title', `%${opts.search}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  // Client-side risk filter (risk is on the joined lead_sources row)
  let leads = (data ?? []) as LeadWithSource[]
  if (opts.risk && opts.risk !== 'all') {
    leads = leads.filter((l) => l.lead_sources?.risk_level === opts.risk)
  }

  return { leads, total: count ?? 0 }
}

/**
 * Fetch a single lead with its full related data:
 * lead_sources, lead_scores, and the 10 most recent audit events.
 * Returns null if the lead does not exist or belongs to another user.
 */
export async function getLeadDetail(
  supabase: SupabaseDb,
  userId: string,
  leadId: string,
): Promise<LeadDetail | null> {
  const [{ data: lead, error: leadError }, { data: events }] = await Promise.all([
    supabase
      .from('leads')
      .select('*, lead_sources(*), lead_scores(*)')
      .eq('id', leadId)
      .eq('user_id', userId)
      .single(),
    supabase
      .from('audit_events')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (leadError) {
    if (leadError.code === 'PGRST116') return null
    throw leadError
  }
  if (!lead) return null

  return {
    ...(lead as unknown as Lead & { lead_sources: LeadSource | null; lead_scores: LeadScore | null }),
    audit_events: (events ?? []) as AuditEvent[],
  }
}

/** Update a lead's status. Enforces ownership via user_id. */
export async function updateLeadStatus(
  supabase: SupabaseDb,
  userId: string,
  leadId: string,
  status: Lead['status'],
): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export type PipelineLead = {
  id: string
  title: string
  status: Lead['status']
  overall_score: number | null
  updated_at: string
}

/**
 * Fetch all active leads for the pipeline view.
 * Returns minimal fields needed for pipeline cards, ordered by score desc.
 */
export async function getLeadsForPipeline(
  supabase: SupabaseDb,
  userId: string,
): Promise<PipelineLead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, title, status, updated_at, lead_scores(overall_score)')
    .eq('user_id', userId)
    .not('status', 'in', '("ignored","blacklisted")')
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) throw error

  return (data ?? []).map((row) => {
    const score = Array.isArray(row.lead_scores)
      ? (row.lead_scores[0] as { overall_score: number } | undefined)?.overall_score ?? null
      : (row.lead_scores as { overall_score: number } | null)?.overall_score ?? null
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      overall_score: score,
      updated_at: row.updated_at,
    }
  })
}

