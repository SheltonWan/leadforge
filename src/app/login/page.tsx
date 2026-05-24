import type { Metadata } from 'next'
import { AuthForm } from '@/features/auth/components/AuthForm'

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

        <AuthForm />
      </div>
    </main>
  )
}
