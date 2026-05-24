import type { AiSummaryAdapter } from './ai-summary-adapter.interface'
import { MockAiSummaryAdapter } from './mock-ai-summary.adapter'

/**
 * createAiSummaryAdapter
 *
 * Returns the real OpenAI adapter when OPENAI_API_KEY is set in the environment,
 * otherwise returns the deterministic mock adapter.
 *
 * Consumers import this factory instead of instantiating adapters directly.
 * Switching between mock and real requires no changes to calling code.
 */
export async function createAiSummaryAdapter(): Promise<AiSummaryAdapter> {
  if (process.env.OPENAI_API_KEY) {
    // Lazy import so the openai package is not bundled when key is absent
    const { OpenAiSummaryAdapter } = await import('./openai-ai-summary.adapter')
    return new OpenAiSummaryAdapter()
  }
  return new MockAiSummaryAdapter()
}
