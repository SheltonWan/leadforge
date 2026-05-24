'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'new', label: '新建' },
  { value: 'reviewed', label: '已审核' },
  { value: 'approved', label: '已批准' },
  { value: 'draft_created', label: '草稿已创建' },
  { value: 'sent', label: '已发送' },
  { value: 'replied', label: '已回复' },
  { value: 'won', label: '已成交' },
  { value: 'lost', label: '已失败' },
  { value: 'ignored', label: '已忽略' },
]

const RISK_OPTIONS = [
  { value: 'all', label: '全部风险' },
  { value: 'low', label: '低风险' },
  { value: 'medium', label: '中风险' },
  { value: 'high', label: '高风险' },
]

export function LeadsFilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentStatus = searchParams.get('status') ?? 'all'
  const currentRisk = searchParams.get('risk') ?? 'all'
  const currentSearch = searchParams.get('search') ?? ''

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // reset to page 1 whenever filter changes
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams],
  )

  return (
    <div
      className={`flex flex-wrap items-center gap-3 transition-opacity ${isPending ? 'opacity-60' : ''}`}
      role="search"
      aria-label="线索筛选"
    >
      {/* Text search */}
      <label className="sr-only" htmlFor="leads-search">
        搜索标题
      </label>
      <input
        id="leads-search"
        type="search"
        placeholder="搜索标题…"
        defaultValue={currentSearch}
        onChange={(e) => update('search', e.target.value)}
        className="h-9 w-48 rounded-md border border-gray-300 px-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        aria-label="搜索线索标题"
      />

      {/* Risk filter */}
      <label className="sr-only" htmlFor="leads-risk">
        风险等级
      </label>
      <select
        id="leads-risk"
        value={currentRisk}
        onChange={(e) => update('risk', e.target.value)}
        className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        aria-label="按风险等级筛选"
      >
        {RISK_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Status tabs */}
      <nav
        className="flex flex-wrap gap-1"
        role="tablist"
        aria-label="按状态筛选"
      >
        {STATUS_OPTIONS.map((opt) => {
          const isActive = currentStatus === opt.value
          return (
            <button
              key={opt.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => update('status', opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 ${
                isActive
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
