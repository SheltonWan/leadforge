import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getLeads } from '@/features/leads/leads.repository'
import type { LeadWithSource } from '@/features/leads/leads.repository'
import { EmptyState } from '@/shared/components/EmptyState'
import { LeadsFilterBar } from '@/features/leads/components/LeadsFilterBar'

export const metadata: Metadata = { title: '商机线索' }

const STATUS_LABELS: Record<string, string> = {
  new: '新建',
  reviewed: '已审核',
  approved: '已批准',
  draft_created: '草稿已创建',
  sent: '已发送',
  replied: '已回复',
  won: '已成交',
  lost: '已失败',
  ignored: '已忽略',
  blacklisted: '已拉黑',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  draft_created: 'bg-purple-100 text-purple-700',
  sent: 'bg-sky-100 text-sky-700',
  replied: 'bg-yellow-100 text-yellow-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-600',
  ignored: 'bg-gray-100 text-gray-500',
  blacklisted: 'bg-red-100 text-red-700',
}

const RISK_CLS: Record<string, string> = {
  low: 'text-green-600',
  medium: 'text-amber-600',
  high: 'font-medium text-red-600',
}

const RISK_LABELS: Record<string, string> = { low: '低', medium: '中', high: '高' }

const COMPLIANCE_LABELS: Record<string, string> = {
  pending: '待确认',
  cleared: '已清',
  blocked: '已阻止',
}

function LeadRow({ lead }: { lead: LeadWithSource }) {
  const risk = lead.lead_sources?.risk_level ?? 'low'
  const date = new Date(lead.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <tr className="hover:bg-gray-50">
      <td className="max-w-[240px] px-4 py-3">
        <p className="truncate text-sm font-medium text-gray-900">{lead.title}</p>
        {lead.industry && <p className="truncate text-xs text-gray-400">{lead.industry}</p>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{lead.location || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{lead.budget_text || '—'}</td>
      <td className={`px-4 py-3 text-sm ${RISK_CLS[risk] ?? 'text-gray-500'}`}>
        {RISK_LABELS[risk] ?? risk}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {COMPLIANCE_LABELS[lead.compliance_status] ?? lead.compliance_status}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {STATUS_LABELS[lead.status] ?? lead.status}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">{date}</td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/leads/${lead.id}`}
          className="text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          详情
        </Link>
      </td>
    </tr>
  )
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; risk?: string; search?: string; page?: string }>
}) {
  const { status, risk, search, page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? '1', 10))
  const limit = 50
  const offset = (currentPage - 1) * limit

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let leads: LeadWithSource[] = []
  let total = 0

  if (user) {
    const result = await getLeads(supabase, user.id, {
      limit,
      offset,
      status,
      risk,
      search,
    }).catch(() => ({ leads: [], total: 0 }))
    leads = result.leads
    total = result.total
  }

  const hasFilters = !!(status || risk || search)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">商机线索</h1>
          {total > 0 && <p className="mt-0.5 text-sm text-gray-500">共 {total} 条</p>}
        </div>
        <Link
          href="/leads/import"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          + 添加线索
        </Link>
      </div>

      <div className="mb-5">
        <Suspense fallback={null}>
          <LeadsFilterBar />
        </Suspense>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title={hasFilters ? '无匹配线索' : '暂无线索'}
          description={
            hasFilters
              ? '尝试调整筛选条件。'
              : '请手动录入或批量上传 CSV。LeadForge 仅处理公开授权来源的信息，不支持抓取非公开联系方式。'
          }
          action={hasFilters ? undefined : { label: '添加线索', href: '/leads/import' }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['标题', '地点', '预算', '风险', '合规', '状态', '录入时间', ''].map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
