/**
 * POST /api/ingest/zbj
 *
 * 触发猪八戒任务爬取并将结果批量写入 leads 表。
 *
 * 请求体（JSON）：
 * {
 *   "cookie":   "从浏览器 DevTools 复制的 cookie 字符串",  // 必填
 *   "keyword":  "小程序开发",                              // 默认 "小程序开发"
 *   "page":     1,                                         // 默认 1（1-based）
 *   "risk_level": "medium"                                 // 默认 medium
 * }
 *
 * 响应：
 * {
 *   "imported": 12,       // 成功写入条数
 *   "skipped":  3,        // 标题/URL 重复跳过条数
 *   "hasMore":  true      // 是否还有下一页
 * }
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ZbjScraperAdapter } from '@/adapters/ingestion/zbj-scraper.adapter'
import { createLead } from '@/features/leads/leads.repository'

const requestSchema = z.object({
  /** Cookie 字符串，仅用于本次请求，不存储。 */
  cookie: z.string().min(10, 'cookie 不能为空'),
  keyword: z.string().min(1).max(100).default('小程序开发'),
  page: z.number().int().min(1).max(50).default(1),
  risk_level: z.enum(['low', 'medium', 'high']).default('medium'),
})

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '需要登录 LeadForge' } },
      { status: 401 },
    )
  }

  // ── Parse request ─────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: '请求体格式错误' } },
      { status: 400 },
    )
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: '参数不合法',
          details: parsed.error.flatten(),
        },
      },
      { status: 422 },
    )
  }

  const { cookie, keyword, page, risk_level } = parsed.data

  // ── Scrape ────────────────────────────────────────────────────────────────
  const adapter = new ZbjScraperAdapter({ cookie })

  let ingestionResult: Awaited<ReturnType<ZbjScraperAdapter['ingest']>>
  try {
    ingestionResult = await adapter.ingest(keyword, page)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '爬取失败'
    return NextResponse.json(
      { error: { code: 'SCRAPE_ERROR', message: msg } },
      { status: 502 },
    )
  }

  const { leads: rawLeads, hasMore, finalUrl } = ingestionResult

  if (rawLeads.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, hasMore, debug: { finalUrl, parsed: 0 } })
  }

  // ── Deduplicate against existing source_urls for this user ────────────────
  const candidateUrls = rawLeads
    .map((l) => l.source_url)
    .filter(Boolean)

  const { data: existing } = await supabase
    .from('leads')
    .select('source_url')
    .eq('user_id', user.id)
    .in('source_url', candidateUrls)

  const existingUrls = new Set((existing ?? []).map((r) => r.source_url))

  // ── Bulk insert (serial to respect rate limits) ───────────────────────────
  let imported = 0
  let skipped = 0

  for (const raw of rawLeads) {
    if (!raw.title) { skipped++; continue }
    if (raw.source_url && existingUrls.has(raw.source_url)) { skipped++; continue }

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
        tos_note: '通过 ZbjScraperAdapter 自动采集，请确认符合猪八戒服务条款后再使用。',
      })
      imported++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ imported, skipped, hasMore, debug: { finalUrl, parsed: rawLeads.length } })
}
