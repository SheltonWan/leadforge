'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const SOURCE_TYPE_LABELS = {
  csv_import: 'CSV 导入',
  manual: '手动录入',
  public_source: '公开来源',
  mock_adapter: '模拟适配器',
} as const

const COLLECTION_METHOD_LABELS = {
  manual_copy: '手动复制',
  csv_import: 'CSV 导入',
  rss: 'RSS 订阅',
  public_api: '公开 API',
} as const

type SourceType = keyof typeof SOURCE_TYPE_LABELS
type CollectionMethod = keyof typeof COLLECTION_METHOD_LABELS

export function AddSourceForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('manual')
  const [url, setUrl] = useState('')
  const [collectionMethod, setCollectionMethod] = useState<CollectionMethod>('manual_copy')
  const [tosNote, setTosNote] = useState('')
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('请填写来源名称'); return }

    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        source_type: sourceType,
        url: url.trim() || undefined,
        collection_method: collectionMethod,
        tos_note: tosNote.trim() || undefined,
        risk_level: riskLevel,
      }),
    })
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null

    if (!res.ok) {
      setError(json?.error?.message ?? '添加失败，请稍后重试')
      return
    }

    setName('')
    setUrl('')
    setTosNote('')
    setOpen(false)
    startTransition(() => router.refresh())
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
      >
        添加来源
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-gray-200 bg-white p-4 space-y-4"
      aria-label="添加来源表单"
    >
      <h2 className="text-sm font-semibold text-gray-800">添加线索来源</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Name */}
        <div>
          <label htmlFor="src-name" className="mb-1 block text-xs font-medium text-gray-600">
            来源名称 <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="src-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：猪八戒网 CSV"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            required
          />
        </div>

        {/* Source type */}
        <div>
          <label htmlFor="src-type" className="mb-1 block text-xs font-medium text-gray-600">
            来源类型
          </label>
          <select
            id="src-type"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as SourceType)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((t) => (
              <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* Collection method */}
        <div>
          <label htmlFor="src-method" className="mb-1 block text-xs font-medium text-gray-600">
            采集方式
          </label>
          <select
            id="src-method"
            value={collectionMethod}
            onChange={(e) => setCollectionMethod(e.target.value as CollectionMethod)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {(Object.keys(COLLECTION_METHOD_LABELS) as CollectionMethod[]).map((m) => (
              <option key={m} value={m}>{COLLECTION_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>

        {/* Risk level */}
        <div>
          <label htmlFor="src-risk" className="mb-1 block text-xs font-medium text-gray-600">
            风险等级
          </label>
          <select
            id="src-risk"
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="low">低风险</option>
            <option value="medium">中等</option>
            <option value="high">高风险</option>
          </select>
        </div>

        {/* URL */}
        <div className="sm:col-span-2">
          <label htmlFor="src-url" className="mb-1 block text-xs font-medium text-gray-600">
            来源 URL（可选）
          </label>
          <input
            id="src-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* ToS note */}
        <div className="sm:col-span-2">
          <label htmlFor="src-tos" className="mb-1 block text-xs font-medium text-gray-600">
            ToS / 合规备注（可选）
          </label>
          <textarea
            id="src-tos"
            rows={2}
            value={tosNote}
            onChange={(e) => setTosNote(e.target.value)}
            placeholder="例如：仅使用公开发布的招标信息，不采集个人联系方式"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? '保存中…' : '添加来源'}
        </button>
      </div>
    </form>
  )
}
