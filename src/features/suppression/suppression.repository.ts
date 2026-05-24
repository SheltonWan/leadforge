import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { SuppressionEntry } from '@/types/domain'

type DB = SupabaseClient<Database>

export async function getSuppressionEntries(
  supabase: DB,
  userId: string,
): Promise<SuppressionEntry[]> {
  const { data, error } = await supabase
    .from('suppression_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function addSuppressionEntry(
  supabase: DB,
  userId: string,
  type: SuppressionEntry['type'],
  value: string,
  reason: string | null,
): Promise<SuppressionEntry> {
  const { data, error } = await supabase
    .from('suppression_entries')
    .insert({ user_id: userId, type, value: value.toLowerCase().trim(), reason })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSuppressionEntry(
  supabase: DB,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('suppression_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * Check if a given source URL or contact domain is suppressed.
 * Returns the matching entry, or null if not suppressed.
 */
export async function checkSuppressed(
  supabase: DB,
  userId: string,
  sourceUrl: string | null,
): Promise<SuppressionEntry | null> {
  if (!sourceUrl) return null

  let hostname: string
  try {
    hostname = new URL(sourceUrl).hostname.toLowerCase()
  } catch {
    return null
  }

  const { data, error } = await supabase
    .from('suppression_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'domain')

  if (error) throw error
  if (!data?.length) return null

  const match = data.find(
    (e) => hostname === e.value || hostname.endsWith(`.${e.value}`),
  )
  return match ?? null
}
