import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { OutreachDraft } from '@/types/domain'

type DB = SupabaseClient<Database>

export async function getDraft(
  supabase: DB,
  leadId: string,
): Promise<OutreachDraft | null> {
  const { data, error } = await supabase
    .from('outreach_drafts')
    .select('*')
    .eq('lead_id', leadId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}

export async function upsertDraft(
  supabase: DB,
  leadId: string,
  subject: string,
  body: string,
): Promise<OutreachDraft> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('outreach_drafts')
    .upsert(
      { lead_id: leadId, subject, body, status: 'draft', generated_at: now },
      { onConflict: 'lead_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDraftBody(
  supabase: DB,
  draftId: string,
  subject: string,
  body: string,
): Promise<OutreachDraft> {
  const { data, error } = await supabase
    .from('outreach_drafts')
    .update({ subject, body })
    .eq('id', draftId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function recordDraftCopied(
  supabase: DB,
  draftId: string,
): Promise<void> {
  const { error } = await supabase
    .from('outreach_drafts')
    .update({ status: 'copied', copied_at: new Date().toISOString() })
    .eq('id', draftId)

  if (error) throw error
}

export async function recordDraftSent(
  supabase: DB,
  draftId: string,
): Promise<void> {
  const { error } = await supabase
    .from('outreach_drafts')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', draftId)

  if (error) throw error
}
