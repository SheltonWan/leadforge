import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getLeadDetail, updateLeadStatus } from '@/features/leads/leads.repository'
import { getProfile } from '@/features/profile/profile.repository'
import { getDraft, upsertDraft } from '@/features/drafts/drafts.repository'
import { checkSuppressed } from '@/features/suppression/suppression.repository'
import { MockOutreachDraftAdapter } from '@/adapters/outreach-draft/mock-outreach-draft.adapter'

const draftAdapter = new MockOutreachDraftAdapter()

// GET /api/leads/[id]/draft — fetch existing draft
export async function GET(
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
  if (!draft) return NextResponse.json({ error: { code: 'DRAFT_NOT_FOUND', message: '尚未生成草稿' } }, { status: 404 })

  return NextResponse.json({ draft })
}

// POST /api/leads/[id]/draft — generate (or regenerate) draft
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

  // T-012 gate: compliance must not be blocked
  if (lead.compliance_status === 'blocked') {
    return NextResponse.json(
      { error: { code: 'COMPLIANCE_BLOCKED', message: '该线索合规状态为已阻止，无法生成草稿。' } },
      { status: 403 },
    )
  }

  // T-012 gate: lead must be approved (or already in draft/sent flow)
  const ALLOWED_STATUSES = new Set(['approved', 'draft_created', 'sent', 'replied'])
  if (!ALLOWED_STATUSES.has(lead.status)) {
    return NextResponse.json(
      { error: { code: 'NOT_APPROVED', message: '请先批准该线索后再生成草稿。' } },
      { status: 422 },
    )
  }

  // T-012 gate: profile must have website_url
  const profile = await getProfile(supabase, user.id)
  if (!profile?.website_url?.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_WEBSITE', message: '请先在服务商档案中填写官网地址，再生成草稿。' } },
      { status: 422 },
    )
  }

  // T-015 gate: source domain must not be suppressed
  const suppressed = await checkSuppressed(supabase, user.id, lead.source_url)
  if (suppressed) {
    return NextResponse.json(
      { error: { code: 'SUPPRESSED', message: `该线索来源域名（${suppressed.value}）在屏蔽名单中，无法生成草稿。` } },
      { status: 403 },
    )
  }

  // Generate draft
  const result = await draftAdapter.generate({ lead, profile })
  const draft = await upsertDraft(supabase, id, result.subject, result.body)

  // Advance lead status to draft_created if still approved
  if (lead.status === 'approved') {
    await updateLeadStatus(supabase, user.id, id, 'draft_created')
  }

  return NextResponse.json({ draft }, { status: 200 })
}

// PATCH /api/leads/[id]/draft — save edited draft body
const patchSchema = z.object({
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 })

  const { id } = await params

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: '请求参数无效' } }, { status: 422 })
  }

  // Verify ownership
  const lead = await getLeadDetail(supabase, user.id, id)
  if (!lead) return NextResponse.json({ error: { code: 'NOT_FOUND', message: '线索不存在' } }, { status: 404 })

  const { updateDraftBody } = await import('@/features/drafts/drafts.repository')
  const draft = await getDraft(supabase, id)
  if (!draft) return NextResponse.json({ error: { code: 'DRAFT_NOT_FOUND', message: '草稿不存在' } }, { status: 404 })

  const updated = await updateDraftBody(supabase, draft.id, parsed.data.subject, parsed.data.body)
  return NextResponse.json({ draft: updated })
}
