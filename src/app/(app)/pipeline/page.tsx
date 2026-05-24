import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadsForPipeline, type PipelineLead } from '@/features/leads/leads.repository'

export const metadata: Metadata = { title: '跟进看板' }

const PIPELINE_STAGES: { key: PipelineLead['status']; label: string; colorCls: string }[] = [
  { key: 'new', label: '新建', colorCls: 'text-gray-500' },
  { key: 'reviewed', label: '已审核', colorCls: 'text-blue-600' },
  { key: 'approved', label: '已批准', colorCls: 'text-green-600' },
  { key: 'draft_created', label: '草稿中', colorCls: 'text-purple-600' },
  { key: 'sent', label: '已发送', colorCls: 'text-sky-600' },
  { key: 'replied', label: '已回复', colorCls: 'text-yellow-600' },
  { key: 'won', label: '已成交', colorCls: 'text-emerald-600' },
]

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const colorCls =
    score >= 70 ? 'bg-green-100 text-green-700' :
    score >= 50 ? 'bg-amber-100 text-amber-700' :
    'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${colorCls}`}>
      {score}
    </span>
  )
}

function LeadCard({ lead }: { lead: PipelineLead }) {
  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm hover:border-sky-300 hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1"
    >
      <p className="line-clamp-2 text-xs font-medium text-gray-800 leading-snug">
        {lead.title}
      </p>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {new Date(lead.updated_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
        </span>
        <ScoreBadge score={lead.overall_score} />
      </div>
    </Link>
  )
}

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const allLeads = await getLeadsForPipeline(supabase, user.id)

  const grouped = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s.key, allLeads.filter((l) => l.status === s.key)])
  ) as Record<PipelineLead['status'], PipelineLead[]>

  const totalActive = allLeads.length

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-gray-900">跟进看板</h1>
        <p className="text-sm text-gray-400">共 {totalActive} 条活跃线索</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(({ key, label, colorCls }) => {
          const leads = grouped[key] ?? []
          return (
            <div key={key} className="w-52 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
                <span className={`text-xs font-semibold ${colorCls}`}>{label}</span>
                <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-500">
                  {leads.length}
                </span>
              </div>
              <div className="min-h-[200px] space-y-1.5 p-2">
                {leads.length === 0 ? (
                  <p className="mt-8 text-center text-xs text-gray-400">暂无线索</p>
                ) : (
                  leads.map((l) => <LeadCard key={l.id} lead={l} />)
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        点击卡片进入线索详情，在详情页变更状态后此看板自动更新。
      </p>
    </div>
  )
}
