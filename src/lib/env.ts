import { z } from 'zod'

// ─── Schema ───────────────────────────────────────────────────────────────────

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g. https://xxx.supabase.co)'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  // Server-only — optional in Milestone 1
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

// ─── Validation utility ───────────────────────────────────────────────────────

/**
 * Validates required environment variables.
 * Call once from instrumentation.ts or a server startup hook.
 * Throws a descriptive error listing every missing/invalid variable.
 */
export function validateServerEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    throw new Error(
      `\n❌ Invalid environment variables:\n${issues}\n\n` +
        `→ Copy .env.example to .env and fill in the required values.\n`,
    )
  }
  return result.data
}
