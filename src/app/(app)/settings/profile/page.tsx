import type { Metadata } from 'next'

export const metadata: Metadata = { title: '服务档案' }

export default function ProfilePage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">服务档案</h1>

      <div
        className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"
        role="status"
      >
        <p className="text-sm text-gray-400">
          公司名称、网站链接、服务类型、目标地区、预算区间、案例片段
        </p>
        <p className="mt-1 text-xs text-gray-400">将在 T-005 实现</p>
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">
        服务档案中的网站和案例是生成个性化外联草稿的必需条件
      </p>
    </div>
  )
}
