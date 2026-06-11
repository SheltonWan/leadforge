/**
 * PUT  /api/profile/zbj-credentials  — 保存猪八戒凭证（加密后存入 user_profiles）
 * DELETE /api/profile/zbj-credentials — 清除猪八戒凭证
 * GET  /api/profile/zbj-credentials  — 查询凭证是否已配置（不返回密码）
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/credential-crypto'

const saveSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(100),
  password: z.string().min(1, '密码不能为空').max(200),
})

// ── GET: check if credentials are configured ──────────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })

  const { data } = await supabase
    .from('user_profiles')
    .select('zbj_username, zbj_password_enc')
    .eq('user_id', user.id)
    .single()

  if (!data?.zbj_username) {
    return NextResponse.json({ configured: false, username: null })
  }

  // Verify decryption works (integrity check), but don't return the password
  try {
    if (data.zbj_password_enc) decrypt(data.zbj_password_enc)
  } catch {
    return NextResponse.json({ configured: false, username: null, error: '凭证已损坏，请重新保存' })
  }

  return NextResponse.json({ configured: true, username: data.zbj_username })
}

// ── PUT: save credentials ─────────────────────────────────────────────────────
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } },
      { status: 400 },
    )
  }

  const { username, password } = parsed.data
  let passwordEnc: string
  try {
    passwordEnc = encrypt(password)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加密失败'
    return NextResponse.json({ error: { code: 'CRYPTO_ERROR', message: msg } }, { status: 500 })
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ zbj_username: username, zbj_password_enc: passwordEnc, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ ok: true, username })
}

// ── DELETE: clear credentials ─────────────────────────────────────────────────
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })

  const { error } = await supabase
    .from('user_profiles')
    .update({ zbj_username: null, zbj_password_enc: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
