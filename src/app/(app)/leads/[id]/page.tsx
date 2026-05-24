import type { Metadata } from 'next'

export const metadata: Metadata = { title: '线索详情' }

export default function LeadDetailPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">线索详情</h1>

      <div
        className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"
        role="status"
      >
        <p className="text-sm text-gray-400">线索摘要、评分说明、合规元数据、审核操作</p>
        <p className="mt-1 text-xs text-gray-400">将在 T-011（详情页）、T-012（审核门控）实现</p>
      </div>
    </div>
  )
}
