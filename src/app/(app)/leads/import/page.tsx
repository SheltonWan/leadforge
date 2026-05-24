import type { Metadata } from 'next'

export const metadata: Metadata = { title: '导入线索' }

export default function LeadsImportPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">导入线索</h1>

      <div
        className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"
        role="status"
      >
        <p className="text-sm text-gray-400">CSV 导入与手动创建表单</p>
        <p className="mt-1 text-xs text-gray-400">将在 T-006（手动创建）、T-007（CSV 导入）实现</p>
      </div>
    </div>
  )
}
