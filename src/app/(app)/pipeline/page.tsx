import type { Metadata } from 'next'

export const metadata: Metadata = { title: '跟进看板' }

const PIPELINE_STAGES = [
  { key: 'new', label: '新建' },
  { key: 'approved', label: '已审核' },
  { key: 'drafted', label: '草稿中' },
  { key: 'sent', label: '已发送' },
  { key: 'replied', label: '已回复' },
  { key: 'closed', label: '已成交' },
]

export default function PipelinePage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">跟进看板</h1>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(({ key, label }) => (
          <div key={key} className="w-52 flex-shrink-0 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
              <span className="text-xs font-semibold text-gray-700">{label}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">0</span>
            </div>
            <div className="min-h-[200px] p-2">
              <p className="mt-8 text-center text-xs text-gray-400">暂无线索</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        线索审核通过后进入此看板 — 状态管理将在 T-016 实现
      </p>
    </div>
  )
}
