/**
 * POST /api/ingest/zbj/auto
 *
 * 使用存储的猪八戒凭证，通过 Playwright 无头浏览器自动登录并抓取任务列表。
 * 无需手动复制 Cookie 或 HTML，完全自动化。
 *
 * ⚠️ 需要先通过 PUT /api/profile/zbj-credentials 保存账号密码。
 * ⚠️ 仅支持本地开发和自托管服务器（Vercel Serverless 不支持 Playwright）。
 *
 * 请求体（JSON）：
 * {
 *   "keyword":    "小程序开发",   // 默认 "小程序开发"
 *   "page":       1,              // 默认 1
 *   "risk_level": "medium"        // 默认 medium
 * }
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/credential-crypto'
import { zbjAutoIngest, CaptchaRequiredError } from '@/adapters/ingestion/zbj-playwright.adapter'
import { createLead } from '@/features/leads/leads.repository'

const requestSchema = z.object({
  keyword: z.string().min(1).max(100).default('小程序开发'),
  page: z.number().int().min(1).max(50).default(1),
  risk_level: z.enum(['low', 'medium', 'high']).default('medium'),
  /** 设为 true 以打开可见浏览器窗口，让用户手动完成验证码 */
  manual: z.boolean().default(false),
})

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '需要登录 LeadForge' } },
      { status: 401 },
    )
  }

  // ── Parse request ─────────────────────────────────────────────────────────
  let body: unknown
  try { body = await request.json() } catch { body = {} }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } },
      { status: 400 },
    )
  }
  const { keyword, page, risk_level, manual } = parsed.data

  // ── Load stored credentials ───────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('zbj_username, zbj_password_enc')
    .eq('user_id', user.id)
    .single()

  if (!profile?.zbj_username || !profile?.zbj_password_enc) {
    return NextResponse.json(
      { error: { code: 'NO_CREDENTIALS', message: '请先在「猪八戒采集」设置中保存账号密码' } },
      { status: 422 },
    )
  }

  let password: string
  try {
    password = decrypt(profile.zbj_password_enc)
  } catch {
    return NextResponse.json(
      { error: { code: 'CRYPTO_ERROR', message: '凭证解密失败，请重新保存账号密码' } },
      { status: 500 },
    )
  }

  // ── Run Playwright scraper ────────────────────────────────────────────────
  let ingestionResult
  try {
    ingestionResult = await zbjAutoIngest(
      { username: profile.zbj_username, password },
      keyword,
      page,
      { headless: !manual, manualTimeout: 120 },
    )
  } catch (err) {
    if (err instanceof CaptchaRequiredError) {
      return NextResponse.json(
        { error: { code: 'CAPTCHA_REQUIRED', message: err.message } },
        { status: 422 },
      )
    }
    const message = err instanceof Error ? err.message : '未知错误'
    return NextResponse.json(
      { error: { code: 'SCRAPE_ERROR', message } },
      { status: 502 },
    )
  }

  const { leads: rawLeads, hasMore } = ingestionResult

  if (rawLeads.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, hasMore, parsed: 0 })
  }

  // ── Bulk insert ───────────────────────────────────────────────────────────
  let imported = 0
  let skipped = 0

  for (const raw of rawLeads) {
    try {
      await createLead(supabase, user.id, {
        title: raw.title,
        description: raw.description,
        source_url: raw.source_url,
        budget_text: raw.budget_text,
        location: raw.location,
        industry: raw.industry,
        published_at: raw.published_at ?? null,
        source_type: 'web_scraper',
        collection_method: 'web_scraper',
        risk_level,
        tos_note: '通过 ZbjPlaywrightAdapter 自动采集，请确认符合猪八戒服务条款后再使用。',
      })
      imported++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ imported, skipped, hasMore, parsed: rawLeads.length })
}
