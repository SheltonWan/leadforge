import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSourcesByUser, createSource } from '@/features/sources/sources.repository'
import { sourceCreateSchema } from '@/features/sources/sources.types'

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

  const sources = await getSourcesByUser(supabase, user.id)
  return NextResponse.json({ sources })
}

export async function POST(request: Request): Promise<NextResponse> {
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

  const body: unknown = await request.json()
  const parsed = sourceCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 422 },
    )
  }

  const source = await createSource(supabase, user.id, parsed.data)
  return NextResponse.json({ source }, { status: 201 })
}
