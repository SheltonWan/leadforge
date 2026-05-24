import { describe, it, expect } from 'vitest'
import { isDomainSuppressed } from './suppression.repository'
import type { SuppressionEntry } from '@/types/domain'

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeEntry(value: string, id = '1'): SuppressionEntry {
  return {
    id,
    user_id: 'user-1',
    type: 'domain',
    value,
    reason: null,
    created_at: '2026-01-01T00:00:00Z',
  }
}

const entries: SuppressionEntry[] = [
  makeEntry('example.com', '1'),
  makeEntry('blocked.org', '2'),
]

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('isDomainSuppressed', () => {
  describe('exact domain match', () => {
    it('returns the entry when hostname exactly matches a suppressed domain', () => {
      const result = isDomainSuppressed('example.com', entries)
      expect(result).not.toBeNull()
      expect(result?.value).toBe('example.com')
    })

    it('matches second entry in the list', () => {
      const result = isDomainSuppressed('blocked.org', entries)
      expect(result).not.toBeNull()
      expect(result?.value).toBe('blocked.org')
    })
  })

  describe('subdomain match', () => {
    it('returns the entry when hostname is a subdomain of a suppressed domain', () => {
      const result = isDomainSuppressed('sub.example.com', entries)
      expect(result).not.toBeNull()
      expect(result?.value).toBe('example.com')
    })

    it('returns the entry for deeply nested subdomain', () => {
      const result = isDomainSuppressed('a.b.c.example.com', entries)
      expect(result).not.toBeNull()
      expect(result?.value).toBe('example.com')
    })
  })

  describe('no match', () => {
    it('returns null when hostname is not suppressed', () => {
      const result = isDomainSuppressed('safe-domain.com', entries)
      expect(result).toBeNull()
    })

    it('returns null when hostname partially matches but is not a subdomain', () => {
      // "notexample.com" should NOT match "example.com"
      const result = isDomainSuppressed('notexample.com', entries)
      expect(result).toBeNull()
    })

    it('returns null when entries list is empty', () => {
      const result = isDomainSuppressed('example.com', [])
      expect(result).toBeNull()
    })
  })

  describe('draft suppression gate logic (integration-style)', () => {
    it('returns entry when multiple domains are suppressed and one matches', () => {
      const many: SuppressionEntry[] = [
        makeEntry('spam.io', '10'),
        makeEntry('unsubscribed.net', '11'),
        makeEntry('example.com', '12'),
      ]
      const result = isDomainSuppressed('www.example.com', many)
      expect(result).not.toBeNull()
      expect(result?.value).toBe('example.com')
    })

    it('returns null when all entries are non-domain type (email/source) — ignores them', () => {
      const emailEntries: SuppressionEntry[] = [
        { ...makeEntry('user@example.com', '20'), type: 'email' },
        { ...makeEntry('https://spam.io/jobs', '21'), type: 'source' },
      ]
      const result = isDomainSuppressed('example.com', emailEntries)
      expect(result).toBeNull()
    })
  })
})
