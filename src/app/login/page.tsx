import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '登录',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm border border-gray-200">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">LeadForge</h1>
          <p className="mt-1 text-sm text-gray-500">合规 B2B 商机雷达</p>
        </div>

        {/* Supabase Auth UI — will be implemented alongside T-005 user profile work */}
        <div
          className="rounded-lg border border-dashed border-gray-300 p-8 text-center"
          role="status"
          aria-label="登录表单加载中"
        >
          <p className="text-sm text-gray-400">Supabase Auth UI</p>
          <p className="mt-1 text-xs text-gray-400">将在 T-005 服务档案实现时接入</p>
        </div>
      </div>
    </main>
  )
}
