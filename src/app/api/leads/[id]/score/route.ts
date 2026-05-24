import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreLead } from '@/features/scoring/scoring.service'
import { getLeadScore } from '@/features/scoring/scoring.repository'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/leads/[id]/score — fetch existing score */
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

    const score = await getLeadScore(supabase, id)
    if (!score) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '该线索暂无评分，请先触发评分。' } },
        { status: 404 },
      )
    }
    return NextResponse.json({ score })
  } catch (err) {
    console.error('[GET /api/leads/[id]/score]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '服务器错误' } },
      { status: 500 },
    )
  }
}

/** POST /api/leads/[id]/score — trigger (re-)scoring */
export async function POST(_request: Request, { params }: RouteContext) {
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

    // Fetch risk level from the joined lead_source for scoring context
    const { data: leadWithSource, error: fetchError } = await supabase
      .from('leads')
      .select('*, lead_sources(risk_level)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !leadWithSource) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '线索不存在' } },
        { status: 404 },
      )
    }

    const riskLevel = (leadWithSource as { lead_sources?: { risk_level?: string } | null })
      .lead_sources?.risk_level as 'low' | 'medium' | 'high' | undefined

    const score = await scoreLead(supabase, user.id, id, riskLevel)
    return NextResponse.json({ score }, { status: 200 })
  } catch (err) {
    console.error('[POST /api/leads/[id]/score]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '评分失败' } },
      { status: 500 },
    )
  }
}
