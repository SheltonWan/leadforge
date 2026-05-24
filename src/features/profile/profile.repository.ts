import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { UserProfile } from '@/types/domain'
import type { ProfileFormData } from './profile.types'

// createServerClient<Database>() returns SupabaseClient<Database, 'public'>
type SupabaseDb = SupabaseClient<Database, 'public'>

/**
 * Fetch the authenticated user's profile. Returns null if no profile exists yet.
 * Throws on unexpected database errors.
 */
export async function getProfile(
  supabase: SupabaseDb,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // PGRST116 = "Searched for one row but found 0 rows"
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

/**
 * Create or update the user's profile (upsert on user_id unique constraint).
 * Always sets updated_at to the current timestamp.
 */
export async function upsertProfile(
  supabase: SupabaseDb,
  userId: string,
  payload: ProfileFormData,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        company_name: payload.company_name,
        website_url: payload.website_url,
        services: payload.services,
        regions: payload.regions,
        min_budget: payload.min_budget,
        max_budget: payload.max_budget,
        case_snippets: payload.case_snippets,
        locale: payload.locale,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}
