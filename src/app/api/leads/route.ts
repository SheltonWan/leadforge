import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { leadCreateSchema } from '@/features/leads/leads.types'
import { createLead, getLeads } from '@/features/leads/leads.repository'
import { scoreLead } from '@/features/scoring/scoring.service'

export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '50')))
    const page = Math.max(0, Number(searchParams.get('page') ?? '0'))

    const { leads, total } = await getLeads(supabase, user.id, {
      limit,
      offset: page * limit,
    })

    return NextResponse.json({ leads, total, page, limit })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '服务器错误' } },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
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

    const parsed = leadCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '输入数据不合法',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 },
      )
    }

    const lead = await createLead(supabase, user.id, parsed.data)

    // Fire-and-forget: score the new lead asynchronously; do not fail the request if it errors
    scoreLead(supabase, user.id, lead.id, parsed.data.risk_level).catch((err: unknown) => {
      console.error('[auto-score] scoreLead failed:', err)
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '服务器错误' } },
      { status: 500 },
    )
  }
}
