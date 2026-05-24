import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardMetrics } from '@/features/dashboard/dashboard.repository'

export const metadata: Metadata = { title: '仪表板' }

type MetricCardProps = {
  label: string
  value: number
  subLabel?: string
  colorCls?: string
}

function MetricCard({ label, value, subLabel, colorCls = 'text-gray-900' }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${colorCls}`}>{value}</p>
      {subLabel && <p className="mt-1 text-xs text-gray-400">{subLabel}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const metrics = await getDashboardMetrics(supabase, user.id)

  const isEmpty = metrics.total === 0

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">仪表板</h1>

      {isEmpty ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <svg aria-hidden className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <p className="text-base font-medium text-gray-700">尚无线索数据</p>
          <p className="mt-1 max-w-sm text-sm text-gray-400">
            导入线索或手动添加后，此页面将展示转化漏斗与高分线索。
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/leads/new"
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
            >
              添加线索
            </Link>
            <Link
              href="/leads/import"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
            >
              导入 CSV
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Metric grid */}
          <section aria-label="核心指标">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricCard label="总线索" value={metrics.total} />
              <MetricCard
                label="已评分"
                value={metrics.scored}
                subLabel={`占 ${metrics.total > 0 ? Math.round((metrics.scored / metrics.total) * 100) : 0}%`}
                colorCls="text-sky-700"
              />
              <MetricCard
                label="已批准"
                value={metrics.approved}
                colorCls="text-green-700"
              />
              <MetricCard
                label="草稿已创建"
                value={metrics.draftCreated}
                colorCls="text-purple-700"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricCard label="已发送" value={metrics.sent} colorCls="text-sky-600" />
              <MetricCard label="已回复" value={metrics.replied} colorCls="text-yellow-600" />
              <MetricCard label="已成交" value={metrics.won} colorCls="text-emerald-700" />
              <MetricCard
                label="转化率（成交/总计）"
                value={metrics.total > 0 ? Math.round((metrics.won / metrics.total) * 100) : 0}
                subLabel="%"
                colorCls={metrics.won > 0 ? 'text-emerald-700' : 'text-gray-400'}
              />
            </div>
          </section>

          {/* Top leads */}
          {metrics.topLeads.length > 0 && (
            <section aria-label="高分线索" className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">高分线索 TOP 5</h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <ul>
                  {metrics.topLeads.map((lead, idx) => (
                    <li
                      key={lead.id}
                      className="flex items-center gap-4 border-b border-gray-50 px-5 py-3 last:border-b-0"
                    >
                      <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-300">
                        {idx + 1}
                      </span>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="flex-1 truncate text-sm font-medium text-gray-800 hover:text-sky-600"
                      >
                        {lead.title}
                      </Link>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                          lead.overall_score >= 70
                            ? 'bg-green-100 text-green-700'
                            : lead.overall_score >= 50
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {lead.overall_score}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-2 text-right">
                <Link href="/leads" className="text-xs text-sky-600 hover:text-sky-700">
                  查看全部线索 →
                </Link>
              </p>
            </section>
          )}

          {/* Quick actions */}
          <section aria-label="快捷操作" className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/leads/new"
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
            >
              添加线索
            </Link>
            <Link
              href="/leads/import"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
            >
              导入 CSV
            </Link>
            <Link
              href="/pipeline"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
            >
              查看跟进看板
            </Link>
          </section>
        </>
      )}
    </div>
  )
}
