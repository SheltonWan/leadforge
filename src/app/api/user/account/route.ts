import { NextResponse } from 'next/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/user/account
 * Permanently deletes all data for the authenticated user.
 * Requires { "confirm": "DELETE" } in the request body as a safety check.
 *
 * Deletion order respects FK constraints:
 *   1. audit_events, suppression_entries (no FK to leads)
 *   2. lead_notes, outreach_drafts, lead_scores (FK → leads)
 *   3. leads (FK → lead_sources)
 *   4. lead_sources, user_profiles
 *   5. auth user (requires SUPABASE_SERVICE_ROLE_KEY if set)
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  // Parse body — accept {} or missing body gracefully
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      {
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Include {"confirm":"DELETE"} in the request body to confirm account deletion.',
        },
      },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 },
    )
  }

  const userId = user.id

  // Step 1: delete records that have no FK dependency on leads
  await Promise.all([
    supabase.from('audit_events').delete().eq('user_id', userId),
    supabase.from('suppression_entries').delete().eq('user_id', userId),
  ])

  // Step 2: get all lead IDs owned by user
  const { data: leads } = await supabase.from('leads').select('id').eq('user_id', userId)
  const leadIds = (leads ?? []).map((l) => l.id)

  // Step 3: delete lead-dependent records
  if (leadIds.length > 0) {
    await Promise.all([
      supabase.from('lead_notes').delete().in('lead_id', leadIds),
      supabase.from('outreach_drafts').delete().in('lead_id', leadIds),
      supabase.from('lead_scores').delete().in('lead_id', leadIds),
    ])
  }

  // Step 4: delete leads then sources
  await supabase.from('leads').delete().eq('user_id', userId)
  await supabase.from('lead_sources').delete().eq('user_id', userId)

  // Step 5: delete user profile
  await supabase.from('user_profiles').delete().eq('user_id', userId)

  // Step 6: sign out current session
  await supabase.auth.signOut()

  // Step 7: hard-delete auth user if service role key is configured
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceRoleKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const adminClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    await adminClient.auth.admin.deleteUser(userId)
  }

  return new NextResponse(null, { status: 204 })
}
