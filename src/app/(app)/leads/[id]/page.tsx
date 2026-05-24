import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadDetail } from '@/features/leads/leads.repository'
import { getLeadNotes } from '@/features/leads/lead-notes.repository'
import { getProfile } from '@/features/profile/profile.repository'
import { MockAiSummaryAdapter } from '@/adapters/ai-summary/mock-ai-summary.adapter'
import { LeadStatusActions } from '@/features/leads/components/LeadStatusActions'
import { LeadNotes } from '@/features/leads/components/LeadNotes'
import type { LeadScore, AuditEvent } from '@/types/domain'

export const metadata: Metadata = { title: '线索详情' }

// ─── Lookup tables ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new: '新建', reviewed: '已审核', approved: '已批准',
  draft_created: '草稿已创建', sent: '已发送', replied: '已回复',
  won: '已成交', lost: '已失败', ignored: '已忽略', blacklisted: '已拉黑',
}
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600', reviewed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700', draft_created: 'bg-purple-100 text-purple-700',
  sent: 'bg-sky-100 text-sky-700', replied: 'bg-yellow-100 text-yellow-700',
  won: 'bg-emerald-100 text-emerald-700', lost: 'bg-red-100 text-red-600',
  ignored: 'bg-gray-100 text-gray-500', blacklisted: 'bg-red-100 text-red-700',
}
const COMPLIANCE_LABELS: Record<string, string> = {
  pending: '待确认', cleared: '已清除', blocked: '已阻止',
}
const COMPLIANCE_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  cleared: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
}
const RISK_LABELS: Record<string, string> = { low: '低', medium: '中', high: '高' }
const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}
const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: '手动录入', csv_import: 'CSV 导入',
  public_source: '公开来源', mock_adapter: '模拟适配器',
}
const COLLECTION_METHOD_LABELS: Record<string, string> = {
  manual_copy: '手动复制', csv_import: 'CSV 导入', rss: 'RSS', public_api: '公开 API',
}
const EVENT_LABELS: Record<string, string> = {
  lead_imported: '已导入', lead_approved: '已批准', lead_ignored: '已忽略',
  draft_generated: '草稿已生成', draft_copied: '草稿已复制',
  status_changed: '状态已变更', blacklisted: '已加入黑名单',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, colorCls }: { label: string; colorCls: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorCls}`}
    >
      {label}
    </span>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-20 shrink-0 text-gray-400">{label}</span>
      <span className="text-gray-700">{children}</span>
    </div>
  )
}

function FactorBar({
  label,
  value,
  invert = false,
}: {
  label: string
  value: number
  invert?: boolean
}) {
  const pct = Math.min(100, Math.max(0, value))
  const barCls = invert
    ? 'bg-red-400'
    : pct >= 70
      ? 'bg-green-500'
      : pct >= 40
        ? 'bg-amber-400'
        : 'bg-red-400'
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-gray-500">{label}</span>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} ${pct}`}
      >
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-medium text-gray-700">
        {invert ? '−' : ''}{value}
      </span>
    </div>
  )
}

function ScorePanel({ score }: { score: LeadScore }) {
  const cls =
    score.overall_score >= 65
      ? 'bg-green-100 text-green-700'
      : score.overall_score >= 40
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-600'
  const scoredDate = new Date(score.scored_at).toLocaleDateString('zh-CN')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span
          className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-3xl font-bold tabular-nums ${cls}`}
          aria-label={`综合评分 ${score.overall_score}`}
        >
          {score.overall_score}
        </span>
        <p className="text-sm text-gray-600">{score.explanation}</p>
      </div>
      <div className="space-y-2">
        <FactorBar label="服务匹配" value={score.service_match} />
        <FactorBar label="预算适配" value={score.budget_fit} />
        <FactorBar label="紧急程度" value={score.urgency} />
        <FactorBar label="地区匹配" value={score.geography_fit} />
        <FactorBar label="风险扣分" value={score.risk_penalty} invert />
      </div>
      <p className="text-right text-xs text-gray-400">
        {score.model_version} · {scoredDate} 更新
      </p>
    </div>
  )
}

function ActivityTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-400">暂无活动记录</p>
  }
  return (
    <ol className="space-y-3">
      {events.map((ev) => (
        <li key={ev.id} className="flex items-start gap-3 text-sm">
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gray-300" aria-hidden />
          <div>
            <span className="font-medium text-gray-700">
              {EVENT_LABELS[ev.event_type] ?? ev.event_type}
            </span>
            <span className="ml-2 text-xs text-gray-400">
              {new Date(ev.created_at).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}

// ─── Adapter instance (module-level singleton for Server Component) ────────────

const aiSummaryAdapter = new MockAiSummaryAdapter()

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const [lead, profile] = await Promise.all([
    getLeadDetail(supabase, user.id, id).catch(() => null),
    getProfile(supabase, user.id).catch(() => null),
  ])

  if (!lead) notFound()

  const [aiSummary, notes] = await Promise.all([
    aiSummaryAdapter.summarize({ lead, profile }).catch(() => null),
    getLeadNotes(supabase, id).catch(() => []),
  ])

  const source = lead.lead_sources
  const score = lead.lead_scores

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="面包屑" className="mb-4 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/leads" className="hover:text-gray-600">
          线索列表
        </Link>
        <span aria-hidden>/</span>
        <span className="text-gray-600 line-clamp-1">{lead.title}</span>
      </nav>

      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{lead.title}</h1>
          {lead.industry && <p className="mt-0.5 text-sm text-gray-400">{lead.industry}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            label={STATUS_LABELS[lead.status] ?? lead.status}
            colorCls={STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}
          />
          <Badge
            label={`合规：${COMPLIANCE_LABELS[lead.compliance_status] ?? lead.compliance_status}`}
            colorCls={COMPLIANCE_COLORS[lead.compliance_status] ?? 'bg-gray-100 text-gray-600'}
          />
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Main column (2/3) ─────────────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-2">
          {/* Lead info */}
          <SectionCard title="线索信息">
            <div className="divide-y divide-gray-50">
              <MetaRow label="地点">{lead.location || <span className="text-gray-300">—</span>}</MetaRow>
              <MetaRow label="预算">{lead.budget_text || <span className="text-gray-300">—</span>}</MetaRow>
              {lead.published_at && (
                <MetaRow label="发布时间">
                  {new Date(lead.published_at).toLocaleDateString('zh-CN')}
                </MetaRow>
              )}
              {lead.source_url && (
                <MetaRow label="来源链接">
                  <a
                    href={lead.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sky-600 hover:text-sky-700"
                  >
                    {lead.source_url}
                  </a>
                </MetaRow>
              )}
            </div>
            {lead.description && (
              <div className="mt-4 border-t border-gray-50 pt-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                  {lead.description}
                </p>
              </div>
            )}
          </SectionCard>

          {/* AI summary */}
          {aiSummary && (
            <SectionCard title="AI 摘要（启发式模型）">
              <p className="mb-3 text-sm text-gray-700">{aiSummary.summary}</p>
              <ul className="mb-3 space-y-1">
                {aiSummary.key_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" aria-hidden />
                    {pt}
                  </li>
                ))}
              </ul>
              <p className="border-t border-gray-50 pt-3 text-xs italic text-gray-400">
                {aiSummary.fit_rationale}
              </p>
              <p className="mt-1 text-right text-xs text-gray-300">{aiSummary.model_version}</p>
            </SectionCard>
          )}

          {/* Score factors */}
          {score ? (
            <SectionCard title="评分详情">
              <ScorePanel score={score} />
            </SectionCard>
          ) : (
            <SectionCard title="评分详情">
              <p className="text-sm text-gray-400">
                暂无评分。创建线索后系统会自动评分；也可在右侧手动触发。
              </p>
            </SectionCard>
          )}
        </div>

        {/* ── Sidebar (1/3) ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Status + actions */}
          <SectionCard title="操作">
            <LeadStatusActions
              leadId={lead.id}
              currentStatus={lead.status}
              complianceStatus={lead.compliance_status}
            />
          </SectionCard>

          {/* Compliance metadata */}
          {source && (
            <SectionCard title="来源合规">
              <div className="divide-y divide-gray-50">
                <MetaRow label="来源类型">
                  {SOURCE_TYPE_LABELS[source.source_type] ?? source.source_type}
                </MetaRow>
                <MetaRow label="采集方式">
                  {COLLECTION_METHOD_LABELS[source.collection_method] ?? source.collection_method}
                </MetaRow>
                <MetaRow label="风险等级">
                  <Badge
                    label={RISK_LABELS[source.risk_level] ?? source.risk_level}
                    colorCls={RISK_COLORS[source.risk_level] ?? 'bg-gray-100 text-gray-600'}
                  />
                </MetaRow>
                {source.tos_note && (
                  <MetaRow label="条款备注">
                    <span className="text-xs">{source.tos_note}</span>
                  </MetaRow>
                )}
                {source.url && (
                  <MetaRow label="来源地址">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs text-sky-600 hover:text-sky-700"
                    >
                      {source.url}
                    </a>
                  </MetaRow>
                )}
              </div>
            </SectionCard>
          )}

          {/* Activity */}
          <SectionCard title="活动记录">
            <ActivityTimeline events={lead.audit_events} />
          </SectionCard>

          {/* Notes */}
          <SectionCard title="跟进备注">
            <LeadNotes leadId={lead.id} initialNotes={notes} />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

