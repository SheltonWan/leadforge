import { describe, it, expect } from 'vitest'
import { HeuristicScoringAdapter } from './heuristic-scoring.adapter'
import type { ScoringContext } from './scoring-adapter.interface'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeLead(overrides: Partial<ScoringContext['lead']> = {}): ScoringContext['lead'] {
  return {
    id: 'lead-1',
    user_id: 'user-1',
    source_id: null,
    title: '寻找网站开发服务商',
    description: '我们需要一家有经验的前端开发公司，擅长 React 开发，预算充足，时间稍紧。',
    source_url: null,
    budget_text: '8万',
    location: '北京',
    industry: '互联网',
    published_at: null,
    status: 'new',
    compliance_status: 'pending',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeProfile(
  overrides: Partial<ScoringContext['profile']> = {},
): ScoringContext['profile'] {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    company_name: '极光科技',
    website_url: 'https://example.com',
    services: ['前端开发', 'React 开发', '小程序开发'],
    regions: ['北京', '上海', '深圳'],
    min_budget: 50000,
    max_budget: 300000,
    case_snippets: '',
    locale: 'zh-CN',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const adapter = new HeuristicScoringAdapter()

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('HeuristicScoringAdapter', () => {
  describe('score() — happy path', () => {
    it('returns overall_score and all factor fields', async () => {
      const result = await adapter.score({ lead: makeLead(), profile: makeProfile() })

      expect(result.overall_score).toBeTypeOf('number')
      expect(result.overall_score).toBeGreaterThanOrEqual(0)
      expect(result.overall_score).toBeLessThanOrEqual(100)
      expect(result.factors).toMatchObject({
        service_match: expect.any(Number),
        budget_fit: expect.any(Number),
        urgency: expect.any(Number),
        geography_fit: expect.any(Number),
        risk_penalty: expect.any(Number),
      })
      expect(result.explanation).toBeTypeOf('string')
      expect(result.explanation.length).toBeGreaterThan(0)
      expect(result.model_version).toBe('heuristic-v1')
    })

    it('scores high when services match, budget fits, region matches, and urgency keyword present', async () => {
      const lead = makeLead({
        title: 'React 前端开发紧急需求，含小程序开发',
        description: '需要 React 开发和小程序开发团队，急需上线，时间紧。',
        budget_text: '10万',
        location: '北京',
      })
      const result = await adapter.score({ lead, profile: makeProfile() })

      // Services: '前端开发', 'React 开发', '小程序开发' → all 3 appear in text
      expect(result.factors.service_match).toBeGreaterThanOrEqual(60)
      expect(result.factors.geography_fit).toBe(100)
      expect(result.factors.urgency).toBeGreaterThan(40)
      expect(result.overall_score).toBeGreaterThanOrEqual(65)
    })

    it('returns neutral score (50) for service_match when profile has no services', async () => {
      const profile = makeProfile({ services: [] })
      const result = await adapter.score({ lead: makeLead(), profile })

      expect(result.factors.service_match).toBe(50)
    })

    it('returns neutral score (50) for budget_fit when lead has no budget text', async () => {
      const lead = makeLead({ budget_text: '' })
      const result = await adapter.score({ lead, profile: makeProfile() })

      expect(result.factors.budget_fit).toBe(50)
    })

    it('returns neutral score (50) for budget_fit when profile has no budget range', async () => {
      const profile = makeProfile({ min_budget: null, max_budget: null })
      const result = await adapter.score({ lead: makeLead(), profile })

      expect(result.factors.budget_fit).toBe(50)
    })

    it('geography_fit is 100 when lead location matches profile region', async () => {
      const result = await adapter.score({
        lead: makeLead({ location: '上海' }),
        profile: makeProfile({ regions: ['上海', '北京'] }),
      })
      expect(result.factors.geography_fit).toBe(100)
    })

    it('geography_fit is 20 when lead location does not match any region', async () => {
      const result = await adapter.score({
        lead: makeLead({ location: '成都' }),
        profile: makeProfile({ regions: ['北京', '上海'] }),
      })
      expect(result.factors.geography_fit).toBe(20)
    })
  })

  describe('score() — risk penalty', () => {
    it('applies 30-point penalty for high-risk lead', async () => {
      const lowRiskResult = await adapter.score({
        lead: makeLead({ risk_level: 'low' }),
        profile: makeProfile(),
      })
      const highRiskResult = await adapter.score({
        lead: makeLead({ risk_level: 'high' }),
        profile: makeProfile(),
      })

      expect(highRiskResult.factors.risk_penalty).toBe(30)
      expect(lowRiskResult.factors.risk_penalty).toBe(0)
      // High-risk score should be lower (or at zero floor)
      expect(highRiskResult.overall_score).toBeLessThan(lowRiskResult.overall_score)
    })

    it('applies 10-point penalty for medium-risk lead', async () => {
      const result = await adapter.score({
        lead: makeLead({ risk_level: 'medium' }),
        profile: makeProfile(),
      })
      expect(result.factors.risk_penalty).toBe(10)
    })

    it('overall_score is never below 0 even with max penalties', async () => {
      const result = await adapter.score({
        lead: makeLead({
          title: 'unrelated gibberish xyz 123',
          description: '',
          budget_text: '100',
          location: '火星',
          risk_level: 'high',
        }),
        profile: makeProfile({ regions: ['北京'] }),
      })
      expect(result.overall_score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('score() — urgency keyword detection', () => {
    it('detects Chinese urgency keywords', async () => {
      const result = await adapter.score({
        lead: makeLead({ title: '急需前端开发，越快越好' }),
        profile: makeProfile(),
      })
      expect(result.factors.urgency).toBeGreaterThan(40)
    })

    it('detects English urgency keyword "urgent"', async () => {
      const result = await adapter.score({
        lead: makeLead({ title: 'Urgent frontend developer needed' }),
        profile: makeProfile(),
      })
      expect(result.factors.urgency).toBeGreaterThan(40)
    })

    it('returns baseline urgency (40) when no keywords present', async () => {
      const result = await adapter.score({
        lead: makeLead({ title: '普通前端开发项目', description: '无时间要求。' }),
        profile: makeProfile(),
      })
      expect(result.factors.urgency).toBe(40)
    })
  })
})
