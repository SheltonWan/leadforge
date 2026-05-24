import { z } from 'zod'

export const sourceCreateSchema = z.object({
  name: z.string().min(1, '来源名称必填').max(100, '名称最多 100 字'),
  source_type: z.enum(['csv_import', 'manual', 'public_source', 'mock_adapter']),
  url: z
    .string()
    .url('请输入有效 URL')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  collection_method: z.enum(['manual_copy', 'csv_import', 'rss', 'public_api']),
  tos_note: z.string().max(500, '备注最多 500 字').optional(),
  risk_level: z.enum(['low', 'medium', 'high']).default('low'),
})

export const sourceUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  tos_note: z.string().max(500).optional(),
  risk_level: z.enum(['low', 'medium', 'high']).optional(),
})

export type SourceCreateInput = z.infer<typeof sourceCreateSchema>
export type SourceUpdateInput = z.infer<typeof sourceUpdateSchema>
