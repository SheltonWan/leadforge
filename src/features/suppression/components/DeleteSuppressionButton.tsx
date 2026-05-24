'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function DeleteSuppressionButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleDelete() {
    const res = await fetch(`/api/suppression/${id}`, { method: 'DELETE' })
    if (res.ok) {
      startTransition(() => router.refresh())
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      aria-label="删除此屏蔽条目"
      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-red-400"
    >
      {isPending ? '…' : '删除'}
    </button>
  )
}
