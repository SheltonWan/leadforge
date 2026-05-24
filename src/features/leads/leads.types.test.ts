import { describe, it, expect } from 'vitest'
import { leadCreateSchema, bulkImportSchema } from './leads.types'

describe('leadCreateSchema', () => {
  describe('happy path', () => {
    it('accepts a fully-specified valid row', () => {
      const result = leadCreateSchema.safeParse({
        title: '寻找 React 前端开发',
        description: '详细描述',
        source_url: 'https://example.com/job/123',
        budget_text: '10万',
        location: '北京',
        industry: '互联网',
        published_at: '2026-01-01',
        source_type: 'public_source',
        collection_method: 'rss',
        risk_level: 'low',
        tos_note: '已阅读条款',
      })
      expect(result.success).toBe(true)
    })

    it('applies defaults for optional fields', () => {
      const result = leadCreateSchema.safeParse({ title: '最小化测试线索' })
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.description).toBe('')
      expect(result.data.source_url).toBe('')
      expect(result.data.budget_text).toBe('')
      expect(result.data.source_type).toBe('manual')
      expect(result.data.collection_method).toBe('manual_copy')
      expect(result.data.risk_level).toBe('low')
    })

    it('transforms empty string published_at to null', () => {
      const result = leadCreateSchema.safeParse({ title: 'T', published_at: '' })
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.published_at).toBeNull()
    })
  })

  describe('validation errors', () => {
    it('rejects empty title', () => {
      const result = leadCreateSchema.safeParse({ title: '' })
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.flatten().fieldErrors.title).toBeDefined()
    })

    it('rejects title longer than 200 characters', () => {
      const result = leadCreateSchema.safeParse({ title: 'x'.repeat(201) })
      expect(result.success).toBe(false)
    })

    it('rejects invalid source_url (non-empty, non-URL)', () => {
      const result = leadCreateSchema.safeParse({
        title: '测试',
        source_url: 'not-a-url',
      })
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.flatten().fieldErrors.source_url).toBeDefined()
    })

    it('accepts empty string source_url (no URL required)', () => {
      const result = leadCreateSchema.safeParse({ title: '测试', source_url: '' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid risk_level enum value', () => {
      const result = leadCreateSchema.safeParse({ title: '测试', risk_level: 'critical' })
      expect(result.success).toBe(false)
    })
  })
})

describe('bulkImportSchema', () => {
  const validRow = { title: '批量导入测试' }

  describe('happy path', () => {
    it('accepts an array with one valid row', () => {
      const result = bulkImportSchema.safeParse({ rows: [validRow] })
      expect(result.success).toBe(true)
    })

    it('accepts an array with 500 rows', () => {
      const rows = Array.from({ length: 500 }, (_, i) => ({ title: `线索 ${i + 1}` }))
      const result = bulkImportSchema.safeParse({ rows })
      expect(result.success).toBe(true)
    })
  })

  describe('validation errors', () => {
    it('rejects empty rows array', () => {
      const result = bulkImportSchema.safeParse({ rows: [] })
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.flatten().fieldErrors.rows).toBeDefined()
    })

    it('rejects more than 500 rows', () => {
      const rows = Array.from({ length: 501 }, (_, i) => ({ title: `线索 ${i + 1}` }))
      const result = bulkImportSchema.safeParse({ rows })
      expect(result.success).toBe(false)
    })

    it('rejects rows with invalid individual entries', () => {
      const result = bulkImportSchema.safeParse({
        rows: [{ title: '' }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing rows field', () => {
      const result = bulkImportSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })
})
