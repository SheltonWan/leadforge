'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function SourceToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleToggle() {
    const res = await fetch(`/api/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    })
    if (res.ok) {
      startTransition(() => router.refresh())
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      aria-pressed={enabled}
      aria-label={enabled ? '点击禁用此来源' : '点击启用此来源'}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        enabled ? 'bg-sky-500' : 'bg-gray-200',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
          enabled ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}
