import { z } from 'zod'

const SOURCE_TYPES = ['manual', 'csv_import', 'public_source', 'mock_adapter', 'web_scraper'] as const
const COLLECTION_METHODS = ['manual_copy', 'csv_import', 'rss', 'public_api', 'web_scraper'] as const
const RISK_LEVELS = ['low', 'medium', 'high'] as const

export const leadCreateSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题最多 200 字'),
  description: z.string().max(5000, '描述最多 5000 字').default(''),
  source_url: z
    .string()
    .max(500)
    .refine(
      (v) => v === '' || z.string().url().safeParse(v).success,
      '来源链接格式不正确，请输入完整 URL（含 https://）',
    )
    .default(''),
  budget_text: z.string().max(100).default(''),
  location: z.string().max(100).default(''),
  industry: z.string().max(100).default(''),
  published_at: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : (v ?? null))),
  // Source compliance metadata — auto-creates a lead_source record
  source_type: z.enum(SOURCE_TYPES).default('manual'),
  collection_method: z.enum(COLLECTION_METHODS).default('manual_copy'),
  risk_level: z.enum(RISK_LEVELS).default('low'),
  tos_note: z.string().max(500).default(''),
})

export type LeadCreateData = z.infer<typeof leadCreateSchema>

export const bulkImportSchema = z.object({
  rows: z
    .array(leadCreateSchema)
    .min(1, '至少需要一行数据')
    .max(500, '单次导入不能超过 500 行'),
})

export type BulkImportData = z.infer<typeof bulkImportSchema>

// CSV column headers — order defines the template column order
export const CSV_HEADERS = [
  'title',
  'description',
  'source_url',
  'budget_text',
  'location',
  'industry',
  'published_at',
  'source_type',
  'collection_method',
  'risk_level',
  'tos_note',
] as const

export type CsvHeader = (typeof CSV_HEADERS)[number]
