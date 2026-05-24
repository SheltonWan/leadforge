import type { Metadata } from 'next'
import { EmptyState } from '@/shared/components/EmptyState'

export const metadata: Metadata = { title: '屏蔽名单' }

export default function SuppressionPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">屏蔽名单</h1>
        <button
          type="button"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          aria-label="添加屏蔽条目"
        >
          添加屏蔽条目
        </button>
      </div>

      <EmptyState
        title="暂无屏蔽记录"
        description="被屏蔽的域名、邮箱或来源将在此显示。屏蔽后不可对其生成外联草稿。"
      />

      <p className="mt-3 text-center text-xs text-gray-400">屏蔽名单管理将在 T-015 实现</p>
    </div>
  )
}
