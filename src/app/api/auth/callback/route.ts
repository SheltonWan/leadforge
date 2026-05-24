import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles Supabase Auth PKCE callback.
 * Supabase redirects here after email confirmation or OAuth with a `code` param.
 * Exchanges the code for a session, then redirects to the app.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Only redirect to paths within the same origin to prevent open redirect.
  const safePath = next.startsWith('/') ? next : '/dashboard'
  return NextResponse.redirect(`${origin}${safePath}`)
}
