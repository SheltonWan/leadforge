'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { LeadNote } from '@/types/domain'

interface Props {
  leadId: string
  initialNotes: LeadNote[]
}

export function LeadNotes({ leadId, initialNotes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState<LeadNote[]>(initialNotes)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setError(null)

    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: text.trim() }),
    })
    const json = (await res.json().catch(() => null)) as
      | { note?: LeadNote; error?: { message?: string } }
      | null

    if (!res.ok) {
      setError(json?.error?.message ?? '添加失败，请稍后重试')
      return
    }
    if (json?.note) {
      setNotes((prev) => [json.note!, ...prev])
    }
    setText('')
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-3">
      {/* Add note form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="note-text" className="sr-only">添加备注</label>
        <textarea
          id="note-text"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="添加跟进备注…"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
        />
        {error && (
          <p role="alert" aria-live="polite" className="text-xs text-red-600">{error}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || !text.trim()}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
          >
            {isPending ? '保存中…' : '保存备注'}
          </button>
        </div>
      </form>

      {/* Note list */}
      {notes.length > 0 ? (
        <ul className="space-y-2" aria-label="跟进备注列表">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="whitespace-pre-wrap text-sm text-gray-800">{n.note}</p>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(n.created_at).toLocaleString('zh-CN')}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400">暂无备注</p>
      )}
    </div>
  )
}
