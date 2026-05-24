import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { LeadNote } from '@/types/domain'

type DB = SupabaseClient<Database>

export async function getLeadNotes(
  supabase: DB,
  leadId: string,
): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data ?? []
}

export async function addLeadNote(
  supabase: DB,
  userId: string,
  leadId: string,
  note: string,
): Promise<LeadNote> {
  const { data, error } = await supabase
    .from('lead_notes')
    .insert({ user_id: userId, lead_id: leadId, note })
    .select()
    .single()

  if (error) throw error
  return data
}
