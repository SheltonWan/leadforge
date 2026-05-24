import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteSuppressionEntry } from '@/features/suppression/suppression.repository'

// DELETE /api/suppression/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 })

  const { id } = await params
  await deleteSuppressionEntry(supabase, user.id, id)
  return NextResponse.json({ ok: true })
}
