import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bulkImportSchema } from '@/features/leads/leads.types'
import { createLead } from '@/features/leads/leads.repository'

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

    const parsed = bulkImportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '导入数据格式不合法',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 },
      )
    }

    const errors: string[] = []
    let created = 0

    for (const row of parsed.data.rows) {
      try {
        await createLead(supabase, user.id, row)
        created++
      } catch (e) {
        errors.push(`"${row.title}": ${e instanceof Error ? e.message : '未知错误'}`)
      }
    }

    return NextResponse.json({ created, errors, total: parsed.data.rows.length })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '服务器错误' } },
      { status: 500 },
    )
  }
}
