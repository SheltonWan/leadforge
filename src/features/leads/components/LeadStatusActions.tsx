'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import Link from 'next/link'
import type { LeadStatus, ComplianceStatus } from '@/types/domain'

interface Props {
  leadId: string
  currentStatus: LeadStatus
  complianceStatus: ComplianceStatus
}

type BtnVariant = 'primary' | 'secondary' | 'danger'

interface ActionBtn {
  label: string
  newStatus: LeadStatus
  variant: BtnVariant
}

const TRANSITIONS: Partial<Record<LeadStatus, ActionBtn[]>> = {
  new: [
    { label: '标记已审核', newStatus: 'reviewed', variant: 'secondary' },
    { label: '批准', newStatus: 'approved', variant: 'primary' },
    { label: '忽略', newStatus: 'ignored', variant: 'danger' },
  ],
  reviewed: [
    { label: '批准', newStatus: 'approved', variant: 'primary' },
    { label: '忽略', newStatus: 'ignored', variant: 'danger' },
  ],
  approved: [
    { label: '取消批准', newStatus: 'reviewed', variant: 'secondary' },
    { label: '忽略', newStatus: 'ignored', variant: 'danger' },
  ],
  ignored: [{ label: '重新激活', newStatus: 'reviewed', variant: 'secondary' }],
  lost: [{ label: '重新激活', newStatus: 'reviewed', variant: 'secondary' }],
}

const BTN_CLS: Record<BtnVariant, string> = {
  primary:
    'rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1',
  secondary:
    'rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1',
  danger:
    'rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1',
}

export function LeadStatusActions({ leadId, currentStatus, complianceStatus }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleStatusUpdate(newStatus: LeadStatus) {
    setError(null)
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      setError(json?.error?.message ?? '操作失败，请稍后重试')
      return
    }
    startTransition(() => router.refresh())
  }

  async function handleRescore() {
    setError(null)
    const res = await fetch(`/api/leads/${leadId}/score`, { method: 'POST' })
    if (!res.ok) {
      setError('重新评分失败，请稍后重试')
      return
    }
    startTransition(() => router.refresh())
  }

  const actions = TRANSITIONS[currentStatus] ?? []

  return (
    <div className="space-y-3">
      {complianceStatus === 'blocked' && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          合规状态为<strong>已阻止</strong>，请先解除风险后再批准。
        </div>
      )}

      {error && (
        <p role="alert" aria-live="polite" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.newStatus}
            onClick={() => handleStatusUpdate(action.newStatus)}
            disabled={
              isPending ||
              (action.newStatus === 'approved' && complianceStatus === 'blocked')
            }
            className={BTN_CLS[action.variant]}
          >
            {isPending ? '处理中…' : action.label}
          </button>
        ))}
      </div>

      {/* Show draft link when approved */}
      {currentStatus === 'approved' && complianceStatus !== 'blocked' && (
        <Link
          href={`/leads/${leadId}/draft`}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        >
          生成外联草稿 →
        </Link>
      )}

      <div className="border-t border-gray-100 pt-3">
        <button
          onClick={handleRescore}
          disabled={isPending}
          className="text-xs text-sky-600 hover:text-sky-700 disabled:opacity-50"
        >
          重新评分
        </button>
      </div>
    </div>
  )
}
