import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { SourceCreateInput, SourceUpdateInput } from './sources.types'

type DB = SupabaseClient<Database>
export type LeadSource = Database['public']['Tables']['lead_sources']['Row']

export async function getSourcesByUser(supabase: DB, userId: string): Promise<LeadSource[]> {
  const { data, error } = await supabase
    .from('lead_sources')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function createSource(
  supabase: DB,
  userId: string,
  input: SourceCreateInput,
): Promise<LeadSource> {
  const { data, error } = await supabase
    .from('lead_sources')
    .insert({
      user_id: userId,
      name: input.name,
      source_type: input.source_type,
      url: input.url ?? null,
      collection_method: input.collection_method,
      tos_note: input.tos_note ?? null,
      risk_level: input.risk_level,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateSource(
  supabase: DB,
  id: string,
  userId: string,
  input: SourceUpdateInput,
): Promise<LeadSource> {
  const { data, error } = await supabase
    .from('lead_sources')
    .update(input)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteSource(supabase: DB, id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('lead_sources')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}
