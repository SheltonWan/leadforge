import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/user/export
 * Returns all data owned by the authenticated user as a downloadable JSON file.
 * Implements PIPL/GDPR data portability requirement.
 */
export async function GET(): Promise<NextResponse> {
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

  // Fetch all user-owned top-level records in parallel
  const [profileRes, sourcesRes, leadsRes, suppressionRes, auditRes] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('lead_sources').select('*').eq('user_id', user.id),
    supabase.from('leads').select('*').eq('user_id', user.id),
    supabase.from('suppression_entries').select('*').eq('user_id', user.id),
    supabase.from('audit_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  // Fetch lead-related records for all leads owned by this user
  const leadIds = (leadsRes.data ?? []).map((l) => l.id)

  const [scoresRes, draftsRes, notesRes] =
    leadIds.length > 0
      ? await Promise.all([
          supabase.from('lead_scores').select('*').in('lead_id', leadIds),
          supabase.from('outreach_drafts').select('*').in('lead_id', leadIds),
          supabase.from('lead_notes').select('*').in('lead_id', leadIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }]

  const exportData = {
    exported_at: new Date().toISOString(),
    // PII: user_id included so the user can verify it is their data
    user_id: user.id,
    profile: profileRes.data ?? null,
    sources: sourcesRes.data ?? [],
    leads: leadsRes.data ?? [],
    lead_scores: scoresRes.data ?? [],
    outreach_drafts: draftsRes.data ?? [],
    lead_notes: notesRes.data ?? [],
    suppression_entries: suppressionRes.data ?? [],
    audit_events: auditRes.data ?? [],
  }

  const filename = `leadforge-export-${new Date().toISOString().split('T')[0]}.json`

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
