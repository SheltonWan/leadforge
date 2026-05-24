import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { AuditEvent } from '@/types/domain'

type DB = SupabaseClient<Database>

/**
 * Write a single audit event. Never throws — errors are logged and swallowed so
 * audit recording never blocks or breaks the primary operation.
 */
export async function writeAuditEvent(
  supabase: DB,
  userId: string,
  leadId: string | null,
  eventType: AuditEvent['event_type'],
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from('audit_events').insert({
      user_id: userId,
      lead_id: leadId,
      event_type: eventType,
      payload: payload ?? null,
    })
  } catch (err) {
    console.error('[audit] failed to write event', { eventType, leadId, err })
  }
}
