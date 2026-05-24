import type { Lead, UserProfile } from '@/types/domain'

export interface AiSummaryContext {
  lead: Lead
  /** May be null if no profile has been set up yet */
  profile: UserProfile | null
}

export interface AiSummaryResult {
  /** 2–3 sentence summary of the lead opportunity */
  summary: string
  /** Up to 3 key extracted facts */
  key_points: string[]
  /** One sentence explaining fit relative to the service provider */
  fit_rationale: string
  /** Adapter version identifier */
  model_version: string
}

export interface AiSummaryAdapter {
  summarize(ctx: AiSummaryContext): Promise<AiSummaryResult>
}
