/** A normalized lead extracted by an ingestion adapter. */
export interface RawLead {
  title: string
  description: string
  source_url: string
  budget_text: string
  location: string
  industry: string
  published_at: string | null
}

export interface IngestionResult {
  leads: RawLead[]
  /** Whether more pages are available */
  hasMore: boolean
  /** Total count when available from the source */
  total?: number
  /** Final response URL after redirects — useful for debugging */
  finalUrl?: string
}

export interface IngestionAdapter {
  /**
   * Fetch one page of raw leads from the source.
   * @param keyword  Search keyword
   * @param page     1-based page index
   */
  ingest(keyword: string, page: number): Promise<IngestionResult>
}
