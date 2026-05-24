import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '页面未找到 – LeadForge' }

/**
 * 404 not-found page.
 * Rendered by Next.js when notFound() is called or no route matches.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8 text-center">
      <span className="text-6xl font-black text-gray-200">404</span>
      <h2 className="text-xl font-semibold text-gray-900">页面不存在</h2>
      <p className="max-w-sm text-sm text-gray-500">
        您访问的页面不存在或已被移除。请检查网址是否正确。
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        返回仪表盘
      </Link>
    </div>
  )
}
