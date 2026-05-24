'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import type { UserProfile } from '@/types/domain'
import { profileSchema, type ProfileFormData } from '../profile.types'

interface ProfileFormProps {
  initialProfile: UserProfile | null
}

// ─── Main form component ───────────────────────────────────────────────────────

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const [isPending, setIsPending] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string[]>>>({})

  // Controlled field values
  const [companyName, setCompanyName] = useState(initialProfile?.company_name ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(initialProfile?.website_url ?? '')
  const [servicesText, setServicesText] = useState(
    initialProfile?.services.join(', ') ?? '',
  )
  const [regionsText, setRegionsText] = useState(
    initialProfile?.regions.join(', ') ?? '',
  )
  const [minBudget, setMinBudget] = useState(
    initialProfile?.min_budget != null ? String(initialProfile.min_budget) : '',
  )
  const [maxBudget, setMaxBudget] = useState(
    initialProfile?.max_budget != null ? String(initialProfile.max_budget) : '',
  )
  const [caseSnippets, setCaseSnippets] = useState(initialProfile?.case_snippets ?? '')

  function parseCSV(text: string): string[] {
    return text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)
    setFieldErrors({})

    const data: ProfileFormData = {
      company_name: companyName,
      website_url: websiteUrl,
      services: parseCSV(servicesText),
      regions: parseCSV(regionsText),
      min_budget: minBudget ? parseInt(minBudget, 10) : null,
      max_budget: maxBudget ? parseInt(maxBudget, 10) : null,
      case_snippets: caseSnippets,
      locale: initialProfile?.locale ?? 'zh-CN',
    }

    // Client-side validation
    const parsed = profileSchema.safeParse(data)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      return
    }

    setIsPending(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } }
        setErrorMsg(body.error?.message ?? '保存失败，请重试')
        return
      }

      setSuccessMsg('服务档案已保存')
    } catch {
      setErrorMsg('网络错误，请重试')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl"
      aria-label="服务档案设置"
      noValidate
    >
      {/* Status announcements */}
      {successMsg && (
        <div
          className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          role="status"
          aria-live="polite"
        >
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div
          className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
          aria-live="assertive"
        >
          {errorMsg}
        </div>
      )}

      {/* Company name */}
      <FormField
        id="company_name"
        label="公司/团队名称"
        required
        error={fieldErrors.company_name?.[0]}
      >
        <input
          id="company_name"
          type="text"
          className={inputCls(!!fieldErrors.company_name)}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          aria-describedby={fieldErrors.company_name ? 'company_name_error' : undefined}
          aria-invalid={!!fieldErrors.company_name}
          required
        />
      </FormField>

      {/* Website URL */}
      <FormField
        id="website_url"
        label="公司网站地址"
        required
        hint="草稿生成时会引用此地址，请确保可公开访问"
        error={fieldErrors.website_url?.[0]}
      >
        <input
          id="website_url"
          type="url"
          placeholder="https://yourcompany.com"
          className={inputCls(!!fieldErrors.website_url)}
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          aria-describedby={
            [
              'website_url_hint',
              fieldErrors.website_url ? 'website_url_error' : '',
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={!!fieldErrors.website_url}
          required
        />
      </FormField>

      {/* Services */}
      <FormField
        id="services"
        label="服务类型"
        required
        hint="用逗号分隔，例如：小程序开发, 网站设计, 企业系统"
        error={fieldErrors.services?.[0]}
      >
        <input
          id="services"
          type="text"
          placeholder="小程序开发, 网站设计, 企业系统"
          className={inputCls(!!fieldErrors.services)}
          value={servicesText}
          onChange={(e) => setServicesText(e.target.value)}
          aria-describedby={
            [
              'services_hint',
              fieldErrors.services ? 'services_error' : '',
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={!!fieldErrors.services}
        />
      </FormField>

      {/* Regions */}
      <FormField
        id="regions"
        label="目标地区"
        hint="用逗号分隔，留空表示不限地区"
      >
        <input
          id="regions"
          type="text"
          placeholder="华东, 华南, 全国"
          className={inputCls(false)}
          value={regionsText}
          onChange={(e) => setRegionsText(e.target.value)}
          aria-describedby="regions_hint"
        />
      </FormField>

      {/* Budget range */}
      <div className="mb-5">
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-gray-700">
            预算区间（元）
          </legend>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label htmlFor="min_budget" className="sr-only">
                最低预算
              </label>
              <input
                id="min_budget"
                type="number"
                placeholder="最低预算"
                min={0}
                className={inputCls(false)}
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
              />
            </div>
            <span className="flex-shrink-0 text-gray-400" aria-hidden="true">
              —
            </span>
            <div className="flex-1">
              <label htmlFor="max_budget" className="sr-only">
                最高预算
              </label>
              <input
                id="max_budget"
                type="number"
                placeholder="最高预算"
                min={0}
                className={inputCls(false)}
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
              />
            </div>
          </div>
        </fieldset>
      </div>

      {/* Case snippets */}
      <FormField
        id="case_snippets"
        label="案例片段"
        hint={`草稿生成时可引用。简要描述 1–3 个代表性项目（${caseSnippets.length}/2000 字）`}
        error={fieldErrors.case_snippets?.[0]}
      >
        <textarea
          id="case_snippets"
          rows={4}
          placeholder="例：为某连锁餐饮开发了点餐小程序，支持堂食+外卖，提升翻台率 30%。"
          className={`${inputCls(!!fieldErrors.case_snippets)} resize-none`}
          value={caseSnippets}
          onChange={(e) => setCaseSnippets(e.target.value)}
          aria-describedby={
            [
              'case_snippets_hint',
              fieldErrors.case_snippets ? 'case_snippets_error' : '',
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          maxLength={2000}
        />
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? '保存中…' : '保存服务档案'}
      </button>
    </form>
  )
}

// ─── Helper: input CSS ────────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    'block w-full rounded-md border px-3 py-2 text-sm',
    'focus:outline-none focus:ring-1',
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-sky-500 focus:ring-sky-500',
  ].join(' ')
}

// ─── Helper: form field wrapper ───────────────────────────────────────────────

function FormField({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={`${id}_hint`} className="mt-0.5 text-xs text-gray-500">
          {hint}
        </p>
      )}
      <div className="mt-1">{children}</div>
      {error && (
        <p id={`${id}_error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
