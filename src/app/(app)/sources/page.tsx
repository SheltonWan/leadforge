import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getSourcesByUser } from '@/features/sources/sources.repository'
import { AddSourceForm } from '@/features/sources/components/AddSourceForm'
import { SourceToggle } from '@/features/sources/components/SourceToggle'
import { DeleteSourceButton } from '@/features/sources/components/DeleteSourceButton'
import { EmptyState } from '@/shared/components/EmptyState'

export const metadata: Metadata = { title: '来源管理' }

const SOURCE_TYPE_LABELS = {
  csv_import: 'CSV 导入',
  manual: '手动录入',
  public_source: '公开来源',
  mock_adapter: '模拟适配器',
  web_scraper: '网页爬取',
} as const

const RISK_BADGES = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-red-50 text-red-700 border-red-200',
} as const

const RISK_LABELS = { low: '低风险', medium: '中等', high: '高风险' } as const

export default async function SourcesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const sources = user ? await getSourcesByUser(supabase, user.id) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">来源管理</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            管理线索来源及其合规状态。仅支持公开授权来源和手动导入。
          </p>
        </div>
      </div>

      <AddSourceForm />

      {sources.length === 0 ? (
        <EmptyState
          title="暂无来源配置"
          description="LeadForge 仅支持公开授权来源和手动 CSV 导入。不支持登录绕过、验证码破解或 ToS 违规抓取。"
          action={{ label: '手动导入线索', href: '/leads/import' }}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">来源名称</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">类型</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">风险</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ToS 备注</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">启用</th>
                <th scope="col" className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.name}
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-xs text-sky-600 hover:underline"
                        aria-label={`访问 ${s.name} 的来源 URL`}
                      >
                        ↗
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {SOURCE_TYPE_LABELS[s.source_type]}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${RISK_BADGES[s.risk_level]}`}>
                      {RISK_LABELS[s.risk_level]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={s.tos_note ?? undefined}>
                    {s.tos_note ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SourceToggle id={s.id} enabled={s.enabled} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteSourceButton id={s.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
