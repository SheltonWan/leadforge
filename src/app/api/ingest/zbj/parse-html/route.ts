/**
 * POST /api/ingest/zbj/parse-html
 *
 * 接受从浏览器直接复制的猪八戒任务列表页 HTML，解析后批量写入 leads 表。
 * 无需传入 cookie，完全避免 TLS 指纹检测导致的 session 失效问题。
 *
 * 使用方法：
 * 1. 在浏览器中登录 zbj.com，打开任务搜索结果页：
 *    https://www.zbj.com/xq/?k=小程序开发&p=1
 * 2. Ctrl+U（Mac: Cmd+Option+U）打开页面源码，全选并复制。
 * 3. POST 到本接口，body 中传入 html 字段。
 *
 * 请求体（JSON）：
 * {
 *   "html":       "<完整的页面 HTML>",   // 必填
 *   "risk_level": "medium"              // 可选，默认 medium
 * }
 *
 * 响应：
 * {
 *   "imported": 12,
 *   "skipped":  3,
 *   "hasMore":  true,
 *   "parsed":   15
 * }
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { parseZbjHtml } from '@/adapters/ingestion/zbj-scraper.adapter'
import { createLead } from '@/features/leads/leads.repository'

const requestSchema = z.object({
  html: z.string().min(100, 'html 内容太短，请粘贴完整的页面源码'),
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
      { error: { code: 'INVALID_JSON', message: '请求体必须是有效的 JSON' } },
      { status: 400 },
    )
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } },
      { status: 400 },
    )
  }

  const { html, risk_level } = parsed.data

  // ── Parse HTML (pure, no network) ─────────────────────────────────────────
  const { leads: rawLeads, hasMore } = parseZbjHtml(html)

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
        tos_note: '通过粘贴猪八戒页面 HTML 采集，请确认符合猪八戒服务条款后再使用。',
      })
      imported++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ imported, skipped, hasMore, parsed: rawLeads.length })
}
