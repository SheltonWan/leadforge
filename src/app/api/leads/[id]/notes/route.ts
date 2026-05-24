import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getLeadDetail } from '@/features/leads/leads.repository'
import { addLeadNote } from '@/features/leads/lead-notes.repository'

const noteSchema = z.object({
  note: z.string().min(1).max(2000),
})

// POST /api/leads/[id]/notes
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 })

  const { id } = await params

  const parsed = noteSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: '备注内容不能为空' } }, { status: 422 })
  }

  // Verify ownership
  const lead = await getLeadDetail(supabase, user.id, id)
  if (!lead) return NextResponse.json({ error: { code: 'NOT_FOUND', message: '线索不存在' } }, { status: 404 })

  const noteRecord = await addLeadNote(supabase, user.id, id, parsed.data.note)
  return NextResponse.json({ note: noteRecord }, { status: 201 })
}
