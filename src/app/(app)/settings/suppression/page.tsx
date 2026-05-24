import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getSuppressionEntries } from '@/features/suppression/suppression.repository'
import { AddSuppressionForm } from '@/features/suppression/components/AddSuppressionForm'
import { DeleteSuppressionButton } from '@/features/suppression/components/DeleteSuppressionButton'

export const metadata: Metadata = { title: '屏蔽名单' }

const TYPE_LABELS: Record<string, string> = {
  domain: '域名', email: '邮箱', source: '来源',
}
const TYPE_COLORS: Record<string, string> = {
  domain: 'bg-blue-100 text-blue-700',
  email: 'bg-purple-100 text-purple-700',
  source: 'bg-amber-100 text-amber-700',
}

export default async function SuppressionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const entries = await getSuppressionEntries(supabase, user.id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">屏蔽名单</h1>
        <p className="mt-1 text-sm text-gray-500">
          被屏蔽的域名、邮箱或来源将无法生成外联草稿。所有匹配项均在草稿生成时自动拦截。
        </p>
      </div>

      {/* Add form */}
      <div className="mb-6">
        <AddSuppressionForm />
      </div>

      {/* Entries table */}
      {entries.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center"
          role="status"
        >
          <p className="text-sm text-gray-400">暂无屏蔽记录</p>
          <p className="mt-1 text-xs text-gray-400">
            添加域名（如 example.com）、邮箱或来源后，系统将自动阻止对其生成外联草稿。
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">类型</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">屏蔽值</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">原因</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">添加时间</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[entry.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[entry.type] ?? entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-800">{entry.value}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{entry.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteSuppressionButton id={entry.id} />
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
