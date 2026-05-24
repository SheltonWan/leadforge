import { z } from 'zod'

export const profileSchema = z.object({
  company_name: z
    .string()
    .min(1, '公司/团队名称必填')
    .max(100, '公司名称不超过 100 字'),
  website_url: z
    .string()
    .min(1, '网站地址必填，草稿生成时会引用此地址')
    .url('请填写有效的网站地址，例如 https://yourcompany.com'),
  services: z
    .array(z.string().min(1))
    .min(1, '至少填写一项服务类型，用于线索匹配评分'),
  regions: z.array(z.string()).default([]),
  min_budget: z.number().int().nonnegative().nullable().default(null),
  max_budget: z.number().int().nonnegative().nullable().default(null),
  case_snippets: z.string().max(2000, '案例不超过 2000 字').default(''),
  locale: z.string().default('zh-CN'),
})

export type ProfileFormData = z.infer<typeof profileSchema>
