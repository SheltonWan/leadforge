import type { Metadata } from 'next'
import { ImportTabs } from '@/features/leads/components/ImportTabs'

export const metadata: Metadata = { title: '添加线索' }

export default function LeadsImportPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">添加线索</h1>
        <p className="mt-1 text-sm text-gray-500">
          手动录入单条线索，或批量上传 CSV。线索仅来自公开授权来源。
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <ImportTabs />
      </div>
    </div>
  )
}
