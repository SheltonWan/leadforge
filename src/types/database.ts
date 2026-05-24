// Placeholder Supabase database types.
// Replace with generated types after running:
//   supabase gen types typescript --project-id <project-id> > src/types/database.ts
// Tables will be defined in T-004 (database schema).

export type Database = {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
