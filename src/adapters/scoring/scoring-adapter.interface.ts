import type { Lead } from '@/types/domain'
import type { UserProfile } from '@/types/domain'

export interface ScoreFactors {
  /** 0–100: how well the lead's industry/title matches the service provider's offering */
  service_match: number
  /** 0–100: how well the stated budget aligns with the provider's min/max budget range */
  budget_fit: number
  /** 0–100: urgency signals detected in title/description */
  urgency: number
  /** 0–100: whether the lead's location is within the provider's target regions */
  geography_fit: number
  /** 0–100: risk penalty subtracted from overall score */
  risk_penalty: number
}

export interface ScoreResult {
  overall_score: number
  factors: ScoreFactors
  explanation: string
  model_version: string
}

export interface ScoringContext {
  lead: Lead & { risk_level?: 'low' | 'medium' | 'high' }
  profile: UserProfile
}

export interface ScoringAdapter {
  score(ctx: ScoringContext): Promise<ScoreResult>
}
