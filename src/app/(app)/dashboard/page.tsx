import type { Metadata } from 'next'
import { EmptyState } from '@/shared/components/EmptyState'

export const metadata: Metadata = { title: '看板' }

const METRIC_CARDS = [
  { label: '总线索', value: '0' },
  { label: '已评分', value: '0' },
  { label: '草稿已创建', value: '0' },
  { label: '已发送', value: '0' },
]

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">看板</h1>

      {/* Summary metrics */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METRIC_CARDS.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <EmptyState
        title="尚未导入线索"
        description="先完善服务档案，再导入或添加线索。系统将自动评分并生成合规外联草稿。"
        action={{ label: '完善服务档案', href: '/settings/profile' }}
      />
    </div>
  )
}
