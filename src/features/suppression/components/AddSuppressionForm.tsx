'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const TYPE_LABELS = { domain: '域名', email: '邮箱', source: '来源' } as const
type SupType = 'domain' | 'email' | 'source'

export function AddSuppressionForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<SupType>('domain')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!value.trim()) { setError('请填写屏蔽值'); return }

    const res = await fetch('/api/suppression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value: value.trim(), reason: reason.trim() || undefined }),
    })
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null

    if (!res.ok) {
      setError(json?.error?.message ?? '添加失败，请稍后重试')
      return
    }

    setValue('')
    setReason('')
    startTransition(() => router.refresh())
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-800">添加屏蔽条目</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Type */}
        <div>
          <label htmlFor="sup-type" className="mb-1 block text-xs font-medium text-gray-600">
            类型
          </label>
          <select
            id="sup-type"
            value={type}
            onChange={(e) => setType(e.target.value as SupType)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {(Object.keys(TYPE_LABELS) as SupType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* Value */}
        <div>
          <label htmlFor="sup-value" className="mb-1 block text-xs font-medium text-gray-600">
            {type === 'domain' ? '域名（如 example.com）' : type === 'email' ? '邮箱地址' : '来源标识'}
          </label>
          <input
            id="sup-value"
            type={type === 'email' ? 'email' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === 'domain' ? 'example.com' : type === 'email' ? 'user@example.com' : '来源名称'}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="sup-reason" className="mb-1 block text-xs font-medium text-gray-600">
            原因（可选）
          </label>
          <input
            id="sup-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="已退订 / 竞争对手 / …"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {error && (
        <p role="alert" aria-live="polite" className="mt-2 text-xs text-red-600">{error}</p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
        >
          {isPending ? '添加中…' : '添加屏蔽'}
        </button>
      </div>
    </form>
  )
}
