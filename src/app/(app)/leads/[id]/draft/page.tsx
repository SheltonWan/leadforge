import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadDetail } from '@/features/leads/leads.repository'
import { getProfile } from '@/features/profile/profile.repository'
import { getDraft } from '@/features/drafts/drafts.repository'
import { DraftEditor } from '@/features/drafts/components/DraftEditor'

export const metadata: Metadata = { title: '外联草稿' }

// Statuses that are allowed to view/generate a draft
const DRAFT_ALLOWED_STATUSES = new Set([
  'approved', 'draft_created', 'sent', 'replied', 'won',
])

export default async function LeadDraftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [lead, profile, draft] = await Promise.all([
    getLeadDetail(supabase, user.id, id),
    getProfile(supabase, user.id),
    getDraft(supabase, id),
  ])

  if (!lead) notFound()

  // ── T-012 gate evaluation ─────────────────────────────────────────────────
  let blockReason: string | null = null

  if (lead.compliance_status === 'blocked') {
    blockReason = '该线索合规状态为"已阻止"，无法生成草稿。请先在线索详情中解除风险后再操作。'
  } else if (!DRAFT_ALLOWED_STATUSES.has(lead.status)) {
    blockReason = '草稿生成仅在线索被批准后可用。请返回线索详情并批准该线索。'
  } else if (!profile?.website_url?.trim()) {
    blockReason = '请先在"服务商档案"中填写官网地址，再生成草稿。'
  }

  const canGenerate = blockReason === null

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="面包屑导航" className="mb-4 flex items-center gap-1.5 text-xs text-gray-400">
        <Link href="/leads" className="hover:text-gray-600">线索列表</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/leads/${id}`} className="max-w-[180px] truncate hover:text-gray-600">
          {lead.title}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-gray-600">外联草稿</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">外联草稿</h1>
          <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">{lead.title}</p>
        </div>
        {!blockReason && profile?.website_url && (
          <a
            href={profile.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-sky-600 hover:underline"
          >
            查看官网 ↗
          </a>
        )}
      </div>

      {/* Missing profile warning */}
      {!profile?.website_url?.trim() && !blockReason?.includes('官网') && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700"
        >
          ⚠ 官网地址未填写。
          <Link href="/settings/profile" className="ml-1 underline hover:text-amber-900">
            前往服务商档案填写
          </Link>
        </div>
      )}

      <DraftEditor
        leadId={id}
        initialDraft={draft}
        canGenerate={canGenerate}
        blockReason={blockReason}
      />
    </div>
  )
}
