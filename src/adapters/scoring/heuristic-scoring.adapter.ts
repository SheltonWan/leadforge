import type { ScoringAdapter, ScoringContext, ScoreResult } from './scoring-adapter.interface'

const MODEL_VERSION = 'heuristic-v1'

const URGENCY_KEYWORDS = [
  '尽快',
  '急',
  '紧急',
  'urgent',
  'asap',
  'immediately',
  '招募中',
  '急需',
  '赶紧',
  '时间紧',
  'rush',
  'deadline',
  '截止',
]

/**
 * Parse a budget string to a numeric estimate.
 * Handles patterns like "50k", "10万", "100,000", "5w", "10-20万"
 */
function parseBudgetNumber(text: string): number | null {
  if (!text) return null
  const cleaned = text.toLowerCase().replace(/,/g, '')

  // "10-20万" → take midpoint
  const rangeMatch = cleaned.match(/([\d.]+)\s*[-~]\s*([\d.]+)\s*(k|w|万|千)?/)
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1])
    const hi = parseFloat(rangeMatch[2])
    const unit = rangeMatch[3] ?? ''
    const factor = unit === 'k' ? 1000 : unit === 'w' || unit === '万' || unit === '千' ? 10000 : 1
    return ((lo + hi) / 2) * factor
  }

  const singleMatch = cleaned.match(/([\d.]+)\s*(k|w|万|千)?/)
  if (!singleMatch) return null
  const num = parseFloat(singleMatch[1])
  const unit = singleMatch[2] ?? ''
  const factor = unit === 'k' ? 1000 : unit === 'w' || unit === '万' || unit === '千' ? 10000 : 1
  return num * factor
}

/**
 * Score service match: check if any of the provider's services appear in the
 * lead's title, description, or industry (case-insensitive substring match).
 */
function scoreServiceMatch(services: string[], lead: ScoringContext['lead']): number {
  if (!services || services.length === 0) return 50 // neutral when no profile yet
  const haystack = [lead.title, lead.description, lead.industry ?? '']
    .join(' ')
    .toLowerCase()
  const matches = services.filter((s) => haystack.includes(s.toLowerCase()))
  return Math.min(100, Math.round((matches.length / services.length) * 100))
}

/**
 * Score budget fit: 100 if lead budget is within profile range, partial credit
 * for overlap, 0 if clearly outside.
 */
function scoreBudgetFit(lead: ScoringContext['lead'], profile: ScoringContext['profile']): number {
  const leadBudget = parseBudgetNumber(lead.budget_text ?? '')
  if (leadBudget === null) return 50 // unknown → neutral
  if (profile.min_budget === null && profile.max_budget === null) return 50

  const min = profile.min_budget ?? 0
  const max = profile.max_budget ?? Infinity

  if (leadBudget >= min && leadBudget <= max) return 100
  if (leadBudget < min) {
    // below minimum — partial if within 50%
    const gap = (min - leadBudget) / min
    return Math.max(0, Math.round((1 - gap) * 80))
  }
  // above maximum — still a good lead, slight penalty
  return 80
}

/**
 * Score urgency based on keyword presence in title + description.
 */
function scoreUrgency(lead: ScoringContext['lead']): number {
  const text = [lead.title, lead.description].join(' ').toLowerCase()
  const hits = URGENCY_KEYWORDS.filter((kw) => text.includes(kw))
  if (hits.length === 0) return 40 // baseline
  return Math.min(100, 40 + hits.length * 20)
}

/**
 * Score geography fit: check if lead's location matches any of the provider's
 * target regions (substring match in either direction).
 */
function scoreGeographyFit(lead: ScoringContext['lead'], regions: string[]): number {
  if (!regions || regions.length === 0) return 60 // neutral when no regions set
  if (!lead.location) return 50
  const loc = lead.location.toLowerCase()
  const hit = regions.some(
    (r) => loc.includes(r.toLowerCase()) || r.toLowerCase().includes(loc),
  )
  return hit ? 100 : 20
}

function riskPenalty(riskLevel?: 'low' | 'medium' | 'high'): number {
  if (riskLevel === 'high') return 30
  if (riskLevel === 'medium') return 10
  return 0
}

function buildExplanation(
  factors: { service_match: number; budget_fit: number; urgency: number; geography_fit: number; risk_penalty: number },
  overall: number,
): string {
  const parts: string[] = []

  if (factors.service_match >= 80) parts.push('服务方向高度匹配')
  else if (factors.service_match >= 50) parts.push('服务方向部分匹配')
  else parts.push('服务方向匹配度较低')

  if (factors.budget_fit >= 80) parts.push('预算在目标范围内')
  else if (factors.budget_fit >= 50) parts.push('预算基本可接受')
  else parts.push('预算低于目标区间')

  if (factors.urgency >= 70) parts.push('含明显紧急信号')
  if (factors.geography_fit >= 80) parts.push('地区高度匹配')
  else if (factors.geography_fit < 40) parts.push('地区不在目标市场')

  if (factors.risk_penalty > 0) {
    parts.push(factors.risk_penalty >= 30 ? '来源高风险（扣分）' : '来源中等风险（小幅扣分）')
  }

  return `综合评分 ${overall}。${parts.join('；')}。`
}

export class HeuristicScoringAdapter implements ScoringAdapter {
  async score(ctx: ScoringContext): Promise<ScoreResult> {
    const { lead, profile } = ctx

    const service_match = scoreServiceMatch(profile.services ?? [], lead)
    const budget_fit = scoreBudgetFit(lead, profile)
    const urgency = scoreUrgency(lead)
    const geography_fit = scoreGeographyFit(lead, profile.regions ?? [])
    const risk_penalty_val = riskPenalty(lead.risk_level)

    const raw =
      service_match * 0.4 +
      budget_fit * 0.2 +
      urgency * 0.2 +
      geography_fit * 0.2 -
      risk_penalty_val

    const overall_score = Math.min(100, Math.max(0, Math.round(raw)))

    const factors = {
      service_match,
      budget_fit,
      urgency,
      geography_fit,
      risk_penalty: risk_penalty_val,
    }

    return {
      overall_score,
      factors,
      explanation: buildExplanation(factors, overall_score),
      model_version: MODEL_VERSION,
    }
  }
}
