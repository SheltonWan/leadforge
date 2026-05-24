'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { leadCreateSchema } from '../leads.types'
import type { LeadCreateData } from '../leads.types'

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_TYPE_LABELS: Record<LeadCreateData['source_type'], string> = {
  manual: '手动录入',
  csv_import: 'CSV 导入',
  public_source: '公开来源',
  mock_adapter: '模拟适配器',
}

const COLLECTION_METHOD_LABELS: Record<LeadCreateData['collection_method'], string> = {
  manual_copy: '手动复制',
  csv_import: 'CSV 文件',
  rss: 'RSS 订阅',
  public_api: '公开 API',
}

const RISK_LEVEL_OPTIONS: { value: LeadCreateData['risk_level']; label: string; desc?: string }[] =
  [
    { value: 'low', label: '低风险' },
    { value: 'medium', label: '中风险' },
    {
      value: 'high',
      label: '高风险',
      desc: '草稿创建将被阻止，需先解决合规问题',
    },
  ]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cls(...args: (string | false | undefined)[]) {
  return args.filter(Boolean).join(' ')
}

const inputBase =
  'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'
const inputErr = 'border-red-400 focus:border-red-400 focus:ring-red-400'

interface FieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}

function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

type FormKey = keyof typeof INITIAL_STATE

const INITIAL_STATE = {
  title: '',
  description: '',
  source_url: '',
  budget_text: '',
  location: '',
  industry: '',
  published_at: '',
  source_type: 'manual' as LeadCreateData['source_type'],
  collection_method: 'manual_copy' as LeadCreateData['collection_method'],
  risk_level: 'low' as LeadCreateData['risk_level'],
  tos_note: '',
}

export function LeadCreateForm() {
  const router = useRouter()

  const [form, setForm] = useState(INITIAL_STATE)
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [apiError, setApiError] = useState('')

  function update<K extends FormKey>(key: K, value: (typeof INITIAL_STATE)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed = leadCreateSchema.safeParse(form)
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors
      setErrors(
        Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0]])) as Partial<
          Record<FormKey, string>
        >,
      )
      return
    }

    setStatus('loading')
    setApiError('')

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } }
        setApiError(json?.error?.message ?? '创建失败，请重试')
        setStatus('error')
        return
      }

      router.push('/leads')
    } catch {
      setApiError('网络错误，请重试')
      setStatus('error')
    }
  }

  const isLoading = status === 'loading'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* ── Lead info ── */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          线索基本信息
        </h3>

        <Field id="title" label="标题" required error={errors.title}>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            aria-required="true"
            aria-describedby={errors.title ? 'title-error' : undefined}
            aria-invalid={errors.title ? true : undefined}
            placeholder="例：某企业寻求定制 CRM 系统开发"
            maxLength={200}
            className={cls(inputBase, errors.title && inputErr)}
          />
        </Field>

        <Field id="description" label="需求描述" error={errors.description}>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            aria-describedby={errors.description ? 'description-error' : undefined}
            aria-invalid={errors.description ? true : undefined}
            placeholder="详细描述项目需求、背景、技术要求等"
            maxLength={5000}
            className={cls(inputBase, errors.description && inputErr)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="source_url" label="来源链接" error={errors.source_url}>
            <input
              id="source_url"
              type="url"
              value={form.source_url}
              onChange={(e) => update('source_url', e.target.value)}
              aria-describedby={errors.source_url ? 'source_url-error' : undefined}
              aria-invalid={errors.source_url ? true : undefined}
              placeholder="https://example.com/post/123"
              className={cls(inputBase, errors.source_url && inputErr)}
            />
          </Field>

          <Field id="budget_text" label="预算描述" error={errors.budget_text}>
            <input
              id="budget_text"
              type="text"
              value={form.budget_text}
              onChange={(e) => update('budget_text', e.target.value)}
              aria-describedby={errors.budget_text ? 'budget_text-error' : undefined}
              aria-invalid={errors.budget_text ? true : undefined}
              placeholder="例：10–20 万元，面议"
              maxLength={100}
              className={cls(inputBase, errors.budget_text && inputErr)}
            />
          </Field>

          <Field id="location" label="地点" error={errors.location}>
            <input
              id="location"
              type="text"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              aria-describedby={errors.location ? 'location-error' : undefined}
              aria-invalid={errors.location ? true : undefined}
              placeholder="例：北京、上海、全国"
              maxLength={100}
              className={cls(inputBase, errors.location && inputErr)}
            />
          </Field>

          <Field id="industry" label="行业" error={errors.industry}>
            <input
              id="industry"
              type="text"
              value={form.industry}
              onChange={(e) => update('industry', e.target.value)}
              aria-describedby={errors.industry ? 'industry-error' : undefined}
              aria-invalid={errors.industry ? true : undefined}
              placeholder="例：教育、零售、医疗"
              maxLength={100}
              className={cls(inputBase, errors.industry && inputErr)}
            />
          </Field>

          <Field id="published_at" label="发布日期" error={errors.published_at}>
            <input
              id="published_at"
              type="date"
              value={form.published_at}
              onChange={(e) => update('published_at', e.target.value)}
              aria-describedby={errors.published_at ? 'published_at-error' : undefined}
              aria-invalid={errors.published_at ? true : undefined}
              className={cls(inputBase, errors.published_at && inputErr)}
            />
          </Field>
        </div>
      </div>

      {/* ── Compliance ── */}
      <div className="space-y-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            来源合规信息
          </h3>
          <p className="mt-1 text-xs text-amber-600">
            LeadForge 仅处理公开授权来源的信息。高风险来源将阻止外联草稿创建，请如实填写。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="source_type" label="来源类型" error={errors.source_type}>
            <select
              id="source_type"
              value={form.source_type}
              onChange={(e) =>
                update('source_type', e.target.value as LeadCreateData['source_type'])
              }
              aria-describedby={errors.source_type ? 'source_type-error' : undefined}
              aria-invalid={errors.source_type ? true : undefined}
              className={cls(inputBase, errors.source_type && inputErr)}
            >
              {Object.entries(SOURCE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>

          <Field id="collection_method" label="采集方式" error={errors.collection_method}>
            <select
              id="collection_method"
              value={form.collection_method}
              onChange={(e) =>
                update(
                  'collection_method',
                  e.target.value as LeadCreateData['collection_method'],
                )
              }
              aria-describedby={errors.collection_method ? 'collection_method-error' : undefined}
              aria-invalid={errors.collection_method ? true : undefined}
              className={cls(inputBase, errors.collection_method && inputErr)}
            >
              {Object.entries(COLLECTION_METHOD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">风险等级</legend>
          <div className="flex flex-wrap gap-5">
            {RISK_LEVEL_OPTIONS.map(({ value, label, desc }) => (
              <label key={value} className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="risk_level"
                  value={value}
                  checked={form.risk_level === value}
                  onChange={(e) =>
                    update('risk_level', e.target.value as LeadCreateData['risk_level'])
                  }
                  className="mt-0.5 h-4 w-4 border-gray-300 text-sky-600 focus:ring-sky-500"
                />
                <span>
                  <span
                    className={cls(
                      'block text-sm font-medium',
                      value === 'high'
                        ? 'text-red-600'
                        : value === 'medium'
                          ? 'text-amber-700'
                          : 'text-gray-700',
                    )}
                  >
                    {label}
                  </span>
                  {desc && <span className="block text-xs text-gray-400">{desc}</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field id="tos_note" label="服务条款备注" error={errors.tos_note}>
          <textarea
            id="tos_note"
            rows={2}
            value={form.tos_note}
            onChange={(e) => update('tos_note', e.target.value)}
            aria-describedby={errors.tos_note ? 'tos_note-error' : undefined}
            aria-invalid={errors.tos_note ? true : undefined}
            placeholder="例：该信息来自某公开社区，平台允许合理商业联系"
            maxLength={500}
            className={cls(inputBase, errors.tos_note && inputErr)}
          />
        </Field>
      </div>

      {/* ── API error ── */}
      {status === 'error' && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {apiError}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/leads')}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isLoading}
          aria-disabled={isLoading}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? '创建中…' : '创建线索'}
        </button>
      </div>
    </form>
  )
}
