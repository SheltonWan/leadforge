import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/shared/components/EmptyState'

export const metadata: Metadata = { title: '商机线索' }

const STATUS_FILTERS = ['全部', '新建', '已审核', '草稿已创建', '已发送', '已回复', '已成交', '无效']

export default function LeadsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">商机线索</h1>
        <Link
          href="/leads/import"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          导入线索
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="状态筛选">
        {STATUS_FILTERS.map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {label}
          </button>
        ))}
      </div>

      <EmptyState
        title="暂无线索"
        description="请导入 CSV 或手动添加线索。LeadForge 仅处理公开授权来源的信息，不支持抓取非公开联系方式。"
        action={{ label: '导入线索', href: '/leads/import' }}
      />
    </div>
  )
}
