import type {
  AiSummaryAdapter,
  AiSummaryContext,
  AiSummaryResult,
} from './ai-summary-adapter.interface'

const MODEL_VERSION = 'mock-v1'

const FIT_TEMPLATES = [
  '该线索的服务需求与您的核心能力高度吻合，建议优先跟进。',
  '该机会的预算和行业背景与您的目标客群较为匹配。',
  '从服务范围来看，您的案例经验可以直接对应该客户痛点。',
  '该线索地区和预算均在目标区间内，是值得投入的跟进对象。',
]

/** Deterministic hash based on a string — used to pick a stable template. */
function quickHash(s: string): number {
  return s.split('').reduce((acc, c) => (acc + c.charCodeAt(0)) & 0xffff, 0)
}

/**
 * MockAiSummaryAdapter
 *
 * Provides deterministic, template-based summaries without any external API call.
 * This establishes the adapter boundary: swap for a real implementation (e.g.
 * OpenAiSummaryAdapter) when an API key is available, with zero changes to
 * consumers.
 */
export class MockAiSummaryAdapter implements AiSummaryAdapter {
  async summarize(ctx: AiSummaryContext): Promise<AiSummaryResult> {
    const { lead, profile } = ctx

    const industry = lead.industry ? `${lead.industry}行业` : '该行业'
    const location = lead.location ? `（${lead.location}）` : ''
    const budgetNote = lead.budget_text ? `预算约 ${lead.budget_text}，` : ''
    const titleSnippet = lead.title.length > 40 ? `${lead.title.slice(0, 40)}…` : lead.title

    const summary =
      `该线索来自${industry}${location}，描述了"${titleSnippet}"相关的业务需求。` +
      `${budgetNote}是一个值得评估的潜在商机。` +
      `评分基于启发式规则，实际匹配度需结合您的服务简介判断。`

    const key_points: string[] = []
    if (lead.industry) key_points.push(`行业：${lead.industry}`)
    if (lead.location) key_points.push(`地区：${lead.location}`)
    if (lead.budget_text) key_points.push(`预算：${lead.budget_text}`)
    if (key_points.length < 3)
      key_points.push('已提取来源合规元数据，请在批准前确认风险等级')
    if (key_points.length < 3) key_points.push('建议补充联系方式和需求细节后再行跟进')

    // Profile-aware rationale when services/regions are configured
    let fit_rationale = FIT_TEMPLATES[quickHash(lead.id) % FIT_TEMPLATES.length]
    if (profile?.services && profile.services.length > 0) {
      fit_rationale = `您的服务方向（${profile.services.slice(0, 2).join('、')}）与该线索有一定重叠，${fit_rationale}`
    }

    return {
      summary,
      key_points: key_points.slice(0, 3),
      fit_rationale,
      model_version: MODEL_VERSION,
    }
  }
}
