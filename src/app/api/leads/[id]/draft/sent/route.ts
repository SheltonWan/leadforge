import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDraft, recordDraftSent } from '@/features/drafts/drafts.repository'
import { getLeadDetail, updateLeadStatus } from '@/features/leads/leads.repository'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 })

  const { id } = await params
  const lead = await getLeadDetail(supabase, user.id, id)
  if (!lead) return NextResponse.json({ error: { code: 'NOT_FOUND', message: '线索不存在' } }, { status: 404 })

  const draft = await getDraft(supabase, id)
  if (!draft) return NextResponse.json({ error: { code: 'DRAFT_NOT_FOUND', message: '草稿不存在' } }, { status: 404 })

  await recordDraftSent(supabase, draft.id)

  // Advance lead status to sent
  if (!['sent', 'replied', 'won', 'lost'].includes(lead.status)) {
    await updateLeadStatus(supabase, user.id, id, 'sent')
  }

  return NextResponse.json({ ok: true })
}
