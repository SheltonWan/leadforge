import type { Metadata } from 'next'

export const metadata: Metadata = { title: '外联草稿' }

export default function LeadDraftPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">外联草稿</h1>

      <div
        className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"
        role="status"
      >
        <p className="text-sm text-gray-400">个性化外联邮件草稿编辑器</p>
        <p className="mt-1 text-xs text-gray-400">
          将在 T-013（草稿生成）、T-014（编辑/复制/标记已发送）实现
        </p>
        <p className="mt-3 text-xs text-amber-600">
          ⚠ 草稿不会自动发送 — 所有发送操作均需人工确认
        </p>
      </div>
    </div>
  )
}
