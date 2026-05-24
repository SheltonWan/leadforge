import type { Metadata } from 'next'
import { EmptyState } from '@/shared/components/EmptyState'

export const metadata: Metadata = { title: '来源管理' }

export default function SourcesPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">来源管理</h1>
        <button
          type="button"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          aria-label="添加来源"
        >
          添加来源
        </button>
      </div>

      <EmptyState
        title="暂无来源配置"
        description="LeadForge 仅支持公开授权来源和手动 CSV 导入。不支持登录绕过、验证码破解或 ToS 违规抓取。"
        action={{ label: '手动导入线索', href: '/leads/import' }}
      />
    </div>
  )
}
