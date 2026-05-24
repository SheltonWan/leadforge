import type { Lead } from '@/types/domain'
import type { UserProfile } from '@/types/domain'

export interface DraftGeneratorContext {
  lead: Lead
  profile: UserProfile
}

export interface DraftGeneratorResult {
  subject: string
  body: string
  model_version: string
}

export interface OutreachDraftAdapter {
  generate(ctx: DraftGeneratorContext): Promise<DraftGeneratorResult>
}
