/**
 * 猪八戒网任务爬取适配器
 *
 * 使用方法：
 * 1. 在浏览器中登录 zbj.com。
 * 2. 打开 DevTools → Application → Cookies → www.zbj.com，
 *    复制所有 cookie（格式：name=value; name2=value2; ...）。
 * 3. 将 cookie 字符串通过 POST /api/ingest/zbj 的 `cookie` 字段传入。
 *
 * 抓取策略（按优先级）：
 *   1. 提取页面内嵌的 Nuxt/Vue SSR JSON 状态（window.__NUXT__ 等）
 *   2. 正则解析 HTML 中的任务卡片锚点
 *
 * ⚠️ 使用前请确认符合猪八戒网服务条款。此适配器不存储 cookie，
 *    每次请求需由调用方传入。
 */

import type { IngestionAdapter, IngestionResult, RawLead } from './ingestion-adapter.interface'

const ZBJ_BASE = 'https://www.zbj.com'
const PAGE_SIZE = 20

export interface ZbjScraperConfig {
  /**
   * 登录后从浏览器 DevTools → Application → Cookies 复制的 cookie 字符串。
   * 格式：`name=value; name2=value2; ...`
   * 此值不会持久化，仅用于当次请求。
   */
  cookie: string
  /** 可选，覆盖 User-Agent（默认使用桌面 Chrome UA）。 */
  userAgent?: string
}

export class ZbjScraperAdapter implements IngestionAdapter {
  constructor(private readonly cfg: ZbjScraperConfig) {}

  async ingest(keyword: string, page: number): Promise<IngestionResult> {
    const url = `${ZBJ_BASE}/xq/?k=${encodeURIComponent(keyword)}&p=${page}`

    let html: string
    let finalUrl: string
    try {
      const res = await fetch(url, {
        headers: buildHeaders(this.cfg),
        redirect: 'follow',
        // Next.js server fetch: opt out of cache so we always get fresh results
        cache: 'no-store',
      })

      finalUrl = res.url
      html = await res.text()

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`猪八戒请求失败：${msg}`)
    }

    // ── Auth guard：检测重定向到登录页 ────────────────────────────────────
    // 用最终响应 URL 判断，避免把导航栏中的"请登录"文字误判为未登录
    if (
      finalUrl.includes('account.zbj.com/login') ||
      finalUrl.includes('zbj.com/login')
    ) {
      throw new Error('Cookie 已过期，请重新登录猪八戒并重新复制 Cookie')
    }

    // ── CAPTCHA guard：检测滑块验证页 ─────────────────────────────────────
    if (
      finalUrl.includes('verify.zbj.com') ||
      html.includes('id="captcha"') ||
      html.includes('拖动下方滑块')
    ) {
      throw new Error('触发人机验证（滑块），请稍后重试或在浏览器中手动通过验证后再试')
    }

    const result = parseTaskListHtml(html)
    return { ...result, finalUrl }
  }
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function buildHeaders(cfg: ZbjScraperConfig): Record<string, string> {
  return {
    Cookie: cfg.cookie,
    'User-Agent':
      cfg.userAgent ??
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: `${ZBJ_BASE}/xq/`,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  }
}

// ── HTML parsing ──────────────────────────────────────────────────────────────

/** 公开导出，供 /api/ingest/zbj/parse-html 使用（纯解析，不发起网络请求）。 */
export function parseZbjHtml(html: string): IngestionResult {
  return parseTaskListHtml(html)
}

function parseTaskListHtml(html: string): IngestionResult {
  // Strategy 1: extract Nuxt / Vue SSR state JSON from <script> tags
  const ssrLeads = tryExtractSsrLeads(html)
  if (ssrLeads.length > 0) {
    return { leads: ssrLeads, hasMore: ssrLeads.length >= PAGE_SIZE }
  }

  // Strategy 2: regex over task-item anchor tags (<a href="/xq/[id].html">)
  const regexLeads = extractLeadsViaRegex(html)
  return { leads: regexLeads, hasMore: regexLeads.length >= PAGE_SIZE }
}

// ── Strategy 1: SSR JSON state ────────────────────────────────────────────────

const SSR_PATTERNS: RegExp[] = [
  /window\.__NUXT__\s*=\s*(\{[\s\S]+?\})\s*;?\s*<\/script>/,
  /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\})\s*;?\s*<\/script>/,
  /window\.__pinia\s*=\s*(\{[\s\S]+?\})\s*;?\s*<\/script>/,
]

function tryExtractSsrLeads(html: string): RawLead[] {
  for (const pattern of SSR_PATTERNS) {
    const m = html.match(pattern)
    if (!m) continue
    try {
      const state = JSON.parse(m[1]) as unknown
      const leads = extractLeadsFromStateTree(state)
      if (leads.length > 0) return leads
    } catch {
      // try next pattern
    }
  }
  return []
}

function extractLeadsFromStateTree(node: unknown): RawLead[] {
  if (!node || typeof node !== 'object') return []

  // Look for an array that looks like a list of task objects
  for (const val of Object.values(node as Record<string, unknown>)) {
    if (Array.isArray(val) && val.length > 0 && looksLikeTaskArray(val)) {
      return (val as unknown[]).map(normalizeStateTask)
    }
    // Recurse one level (avoid deep recursion on large objects)
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const nested = extractLeadsFromStateTree(val)
      if (nested.length > 0) return nested
    }
  }
  return []
}

function looksLikeTaskArray(arr: unknown[]): boolean {
  const sample = arr[0] as Record<string, unknown>
  return (
    typeof sample === 'object' &&
    sample !== null &&
    ('title' in sample || 'taskName' in sample || 'name' in sample) &&
    ('id' in sample || 'taskId' in sample)
  )
}

function normalizeStateTask(item: unknown): RawLead {
  const t = item as Record<string, unknown>
  const id = t.id ?? t.taskId ?? t.taskNo ?? ''
  const sourceUrl = id ? `${ZBJ_BASE}/xq/${id}.html` : ''

  let publishedAt: string | null = null
  const rawTime = t.publishTime ?? t.createTime ?? t.publishedAt
  if (typeof rawTime === 'number') {
    publishedAt = new Date(rawTime * (rawTime < 1e12 ? 1000 : 1)).toISOString()
  } else if (typeof rawTime === 'string' && rawTime) {
    publishedAt = rawTime
  }

  return {
    title: String(t.title ?? t.taskName ?? t.name ?? '').trim(),
    description: String(t.description ?? t.desc ?? t.content ?? '').trim(),
    source_url: sourceUrl,
    budget_text: String(t.budgetRange ?? t.budget ?? t.minBudget ?? t.price ?? '').trim(),
    location: String(t.location ?? t.city ?? t.province ?? t.area ?? '').trim(),
    industry: String(t.categoryName ?? t.category ?? t.typeName ?? t.type ?? '').trim(),
    published_at: publishedAt,
  }
}

// ── Strategy 2: regex over anchor tags ───────────────────────────────────────

function extractLeadsViaRegex(html: string): RawLead[] {
  const leads: RawLead[] = []

  // Match <a href="/xq/[id].html" ...>title text</a>
  // Exclude navigation links (very short text) and anchors with child elements
  const anchorPattern = /<a[^>]+href="(\/xq\/(\d{5,}?)\.html)"[^>]*>([^<]{5,200})<\/a>/g
  const seen = new Set<string>()

  let m: RegExpExecArray | null
  while ((m = anchorPattern.exec(html)) !== null) {
    const [, path, , rawTitle] = m
    const title = decodeHtmlEntities(rawTitle.trim())
    if (seen.has(path) || title.length < 5) continue
    seen.add(path)

    // Try to extract budget from nearby text (heuristic: look for ¥ or 元 near the anchor)
    const contextStart = Math.max(0, m.index - 200)
    const contextEnd = Math.min(html.length, m.index + m[0].length + 400)
    const context = html.slice(contextStart, contextEnd)

    leads.push({
      title,
      description: '',
      source_url: `${ZBJ_BASE}${path}`,
      budget_text: extractBudgetFromContext(context),
      location: extractLocationFromContext(context),
      industry: '',
      published_at: null,
    })
  }

  return leads
}

function extractBudgetFromContext(ctx: string): string {
  // Matches patterns like: ¥5,000、5000元、5000-10000、5k、5w
  const m = ctx.match(
    /(?:预算[：:]\s*)?(¥\s?[\d,]+(?:\s*[-~]\s*[\d,]+)?(?:\s*万|k)?|[\d,]+(?:\s*[-~]\s*[\d,]+)?\s*(?:元|万元|k|w))/i,
  )
  return m ? m[0].trim() : ''
}

function extractLocationFromContext(ctx: string): string {
  // Common Chinese cities / provinces
  const cities = [
    '北京', '上海', '广州', '深圳', '成都', '杭州', '武汉', '西安', '重庆', '南京',
    '天津', '苏州', '郑州', '长沙', '东莞', '佛山', '宁波', '合肥', '青岛', '惠州',
  ]
  for (const city of cities) {
    if (ctx.includes(city)) return city
  }
  return ''
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
