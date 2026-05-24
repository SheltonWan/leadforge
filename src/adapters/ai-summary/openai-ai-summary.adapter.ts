import OpenAI from 'openai'
import type {
  AiSummaryAdapter,
  AiSummaryContext,
  AiSummaryResult,
} from './ai-summary-adapter.interface'

const MODEL_VERSION = 'openai-gpt-4o-mini-v1'

/**
 * OpenAiSummaryAdapter
 *
 * Uses OpenAI chat completions to generate a lead opportunity summary.
 * Instantiated only when OPENAI_API_KEY is set — see the adapter factory.
 *
 * The prompt is designed to return structured JSON so parsing is reliable.
 * Falls back gracefully if the model returns malformed output.
 */
export class OpenAiSummaryAdapter implements AiSummaryAdapter {
  private readonly client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    })
  }

  async summarize(ctx: AiSummaryContext): Promise<AiSummaryResult> {
    const { lead, profile } = ctx

    const profileContext = profile
      ? `服务方向：${profile.services?.join('、') ?? '未填写'}。目标地区：${profile.regions?.join('、') ?? '未填写'}。预算范围：${profile.min_budget ?? '?'}–${profile.max_budget ?? '?'} 元。`
      : '服务简介暂未填写。'

    const systemPrompt = `你是一个专业的 B2B 商机分析助手。根据线索信息和服务提供商背景，生成一份简短的商机摘要。
用中文回复。严格按照如下 JSON 格式输出，不要输出任何其他内容：
{
  "summary": "2-3句话概述线索机会",
  "key_points": ["要点1", "要点2", "要点3"],
  "fit_rationale": "1句话说明与服务提供商的匹配度"
}`

    const userMessage = `线索标题：${lead.title}
描述：${lead.description ?? '无'}
行业：${lead.industry ?? '未知'}
地区：${lead.location ?? '未知'}
预算：${lead.budget_text ?? '未披露'}
合规状态：${lead.compliance_status}

服务提供商背景：${profileContext}`

    type ParsedResult = { summary: string; key_points: string[]; fit_rationale: string }
    let parsed: ParsedResult | null = null

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      })

      const content = completion.choices[0]?.message?.content ?? ''
      parsed = JSON.parse(content) as ParsedResult
    } catch {
      // OpenAI call failed or JSON malformed — caller handles null via .catch()
      throw new Error('OpenAiSummaryAdapter: failed to generate summary')
    }

    if (!parsed || typeof parsed.summary !== 'string') {
      throw new Error('OpenAiSummaryAdapter: unexpected response shape')
    }

    return {
      summary: parsed.summary,
      key_points: Array.isArray(parsed.key_points)
        ? parsed.key_points.slice(0, 3)
        : [],
      fit_rationale: parsed.fit_rationale ?? '',
      model_version: MODEL_VERSION,
    }
  }
}
