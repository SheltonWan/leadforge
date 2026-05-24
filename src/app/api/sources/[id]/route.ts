import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSource, deleteSource } from '@/features/sources/sources.repository'
import { sourceUpdateSchema } from '@/features/sources/sources.types'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
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

  const { id } = await params
  const body: unknown = await request.json()
  const parsed = sourceUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 422 },
    )
  }

  const source = await updateSource(supabase, id, user.id, parsed.data)
  return NextResponse.json({ source })
}

export async function DELETE(_request: Request, { params }: RouteContext): Promise<NextResponse> {
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

  const { id } = await params
  await deleteSource(supabase, id, user.id)
  return new NextResponse(null, { status: 204 })
}
