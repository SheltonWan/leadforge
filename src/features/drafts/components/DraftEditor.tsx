'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { OutreachDraft } from '@/types/domain'

interface Props {
  leadId: string
  initialDraft: OutreachDraft | null
  canGenerate: boolean   // true when lead is approved and profile has website
  blockReason: string | null  // non-null when gate is triggered
}

export function DraftEditor({ leadId, initialDraft, canGenerate, blockReason }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [draft, setDraft] = useState<OutreachDraft | null>(initialDraft)
  const [subject, setSubject] = useState(initialDraft?.subject ?? '')
  const [body, setBody] = useState(initialDraft?.body ?? '')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // ── Generate / Regenerate ─────────────────────────────────────────────────

  async function handleGenerate() {
    setError(null)
    setSuccessMsg(null)
    const res = await fetch(`/api/leads/${leadId}/draft`, { method: 'POST' })
    const json = (await res.json().catch(() => null)) as
      | { draft?: OutreachDraft; error?: { message?: string } }
      | null

    if (!res.ok) {
      setError(json?.error?.message ?? '生成草稿失败，请稍后重试')
      return
    }
    if (json?.draft) {
      setDraft(json.draft)
      setSubject(json.draft.subject)
      setBody(json.draft.body)
      setIsDirty(false)
    }
    startTransition(() => router.refresh())
  }

  // ── Save edited draft ─────────────────────────────────────────────────────

  async function handleSave() {
    if (!draft || !isDirty) return
    setError(null)
    setSuccessMsg(null)
    const res = await fetch(`/api/leads/${leadId}/draft`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    })
    const json = (await res.json().catch(() => null)) as
      | { draft?: OutreachDraft; error?: { message?: string } }
      | null

    if (!res.ok) {
      setError(json?.error?.message ?? '保存失败，请稍后重试')
      return
    }
    if (json?.draft) {
      setDraft(json.draft)
      setIsDirty(false)
    }
    setSuccessMsg('草稿已保存')
    setTimeout(() => setSuccessMsg(null), 2500)
  }

  // ── Copy to clipboard ─────────────────────────────────────────────────────

  async function handleCopy() {
    if (!draft) return
    setError(null)
    await navigator.clipboard.writeText(`${subject}\n\n${body}`)

    // Record copy event
    await fetch(`/api/leads/${leadId}/draft/copy`, { method: 'POST' }).catch(() => null)
    setSuccessMsg('已复制到剪贴板')
    setTimeout(() => setSuccessMsg(null), 2500)
    startTransition(() => router.refresh())
  }

  // ── Mark sent ────────────────────────────────────────────────────────────

  async function handleMarkSent() {
    if (!draft) return
    setError(null)
    const res = await fetch(`/api/leads/${leadId}/draft/sent`, { method: 'POST' })
    if (!res.ok) {
      setError('标记失败，请稍后重试')
      return
    }
    setSuccessMsg('已标记为已发送，线索状态已更新')
    setTimeout(() => setSuccessMsg(null), 3000)
    startTransition(() => router.refresh())
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (blockReason) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center"
      >
        <p className="text-sm font-medium text-red-700">{blockReason}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {canGenerate && (
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
          >
            {isPending ? '处理中…' : draft ? '重新生成草稿' : '生成草稿'}
          </button>
        )}

        {draft && (
          <>
            <button
              onClick={handleSave}
              disabled={isPending || !isDirty}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
            >
              保存修改
            </button>
            <button
              onClick={handleCopy}
              disabled={isPending}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
            >
              复制全文
            </button>
            <button
              onClick={handleMarkSent}
              disabled={isPending || draft.status === 'sent'}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1"
            >
              {draft.status === 'sent' ? '已发送 ✓' : '标记为已发送'}
            </button>
          </>
        )}
      </div>

      {/* Status banner */}
      {error && (
        <p role="alert" aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {successMsg && (
        <p role="status" aria-live="polite" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          {successMsg}
        </p>
      )}

      {/* Draft metadata */}
      {draft && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          <span>状态：<span className="font-medium text-gray-600">
            {draft.status === 'draft' ? '草稿' : draft.status === 'copied' ? '已复制' : '已发送'}
          </span></span>
          {draft.generated_at && <span>生成时间：{new Date(draft.generated_at).toLocaleString('zh-CN')}</span>}
          {draft.copied_at && <span>复制时间：{new Date(draft.copied_at).toLocaleString('zh-CN')}</span>}
          {draft.sent_at && <span>发送时间：{new Date(draft.sent_at).toLocaleString('zh-CN')}</span>}
        </div>
      )}

      {/* Editor */}
      {draft ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="draft-subject" className="mb-1 block text-sm font-medium text-gray-700">
              邮件主题
            </label>
            <input
              id="draft-subject"
              type="text"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setIsDirty(true) }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label htmlFor="draft-body" className="mb-1 block text-sm font-medium text-gray-700">
              邮件正文
            </label>
            <textarea
              id="draft-body"
              rows={16}
              value={body}
              onChange={(e) => { setBody(e.target.value); setIsDirty(true) }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <p className="text-xs text-amber-600">
            ⚠ 草稿不会自动发送 — 所有发送操作均需人工确认
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"
          role="status"
        >
          <p className="text-sm text-gray-400">
            {canGenerate
              ? '点击上方"生成草稿"按钮，系统将根据线索需求和您的服务档案自动生成个性化外联邮件。'
              : '无法生成草稿，请检查线索批准状态和服务档案配置。'}
          </p>
        </div>
      )}
    </div>
  )
}
