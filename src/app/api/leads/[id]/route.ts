import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getLeadDetail, updateLeadStatus } from '@/features/leads/leads.repository'
import { writeAuditEvent } from '@/features/audit/audit.repository'

type RouteContext = { params: Promise<{ id: string }> }

const LEAD_STATUSES = [
  'new',
  'reviewed',
  'approved',
  'draft_created',
  'sent',
  'replied',
  'won',
  'lost',
  'ignored',
  'blacklisted',
] as const

const patchSchema = z.object({
  status: z.enum(LEAD_STATUSES),
})

/** GET /api/leads/[id] — fetch lead with source + score */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '需要登录' } },
        { status: 401 },
      )
    }

    const lead = await getLeadDetail(supabase, user.id, id)
    if (!lead) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '线索不存在' } },
        { status: 404 },
      )
    }

    return NextResponse.json({ lead })
  } catch (err) {
    console.error('[GET /api/leads/[id]]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '服务器错误' } },
      { status: 500 },
    )
  }
}

/** PATCH /api/leads/[id] — update lead status */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '需要登录' } },
        { status: 401 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: '请求体格式错误' } },
        { status: 400 },
      )
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的状态值',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 },
      )
    }

    // Block approval if compliance_status is 'blocked'
    if (parsed.data.status === 'approved') {
      const current = await getLeadDetail(supabase, user.id, id)
      if (!current) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: '线索不存在' } },
          { status: 404 },
        )
      }
      if (current.compliance_status === 'blocked') {
        return NextResponse.json(
          {
            error: {
              code: 'COMPLIANCE_BLOCKED',
              message: '合规状态为"已阻止"，无法批准该线索，请先解除风险。',
            },
          },
          { status: 409 },
        )
      }
    }

    const lead = await updateLeadStatus(supabase, user.id, id, parsed.data.status)

    // Write audit event (fire-and-forget)
    const eventType =
      parsed.data.status === 'approved' ? 'lead_approved' :
      parsed.data.status === 'ignored' ? 'lead_ignored' :
      parsed.data.status === 'blacklisted' ? 'blacklisted' :
      'status_changed'
    void writeAuditEvent(supabase, user.id, id, eventType, { status: parsed.data.status })

    return NextResponse.json({ lead })
  } catch (err) {
    console.error('[PATCH /api/leads/[id]]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '服务器错误' } },
      { status: 500 },
    )
  }
}
