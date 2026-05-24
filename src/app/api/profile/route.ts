import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/features/profile/profile.types'
import { getProfile, upsertProfile } from '@/features/profile/profile.repository'

// ─── GET /api/profile ─────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    )
  }

  try {
    const profile = await getProfile(supabase, user.id)
    return NextResponse.json(profile) // null when no profile exists yet
  } catch (err) {
    console.error('[GET /api/profile]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' } },
      { status: 500 },
    )
  }
}

// ─── PUT /api/profile ─────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 },
    )
  }

  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid profile data',
          details: parsed.error.flatten(),
        },
      },
      { status: 422 },
    )
  }

  try {
    const profile = await upsertProfile(supabase, user.id, parsed.data)
    return NextResponse.json(profile)
  } catch (err) {
    console.error('[PUT /api/profile]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to save profile' } },
      { status: 500 },
    )
  }
}
