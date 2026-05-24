import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  getSuppressionEntries,
  addSuppressionEntry,
} from '@/features/suppression/suppression.repository'

// GET /api/suppression — list entries
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 })

  const entries = await getSuppressionEntries(supabase, user.id)
  return NextResponse.json({ entries })
}

// POST /api/suppression — add entry
const addSchema = z.object({
  type: z.enum(['domain', 'email', 'source']),
  value: z.string().min(1).max(255),
  reason: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 })

  const parsed = addSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: '请求参数无效' } }, { status: 422 })
  }

  const entry = await addSuppressionEntry(
    supabase,
    user.id,
    parsed.data.type,
    parsed.data.value,
    parsed.data.reason ?? null,
  )
  return NextResponse.json({ entry }, { status: 201 })
}
