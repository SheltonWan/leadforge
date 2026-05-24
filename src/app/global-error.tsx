'use client'

import { useEffect } from 'react'

/**
 * Root-level error boundary (global-error.tsx).
 * Catches errors that escape the root layout, including errors in layout.tsx itself.
 * Must render its own <html> and <body> tags per Next.js App Router requirements.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError boundary]', error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8 text-center font-sans">
        <h1 className="text-2xl font-bold text-gray-900">应用出错</h1>
        <p className="max-w-sm text-sm text-gray-500">
          应用遇到严重错误，无法继续。请刷新页面，如问题持续请联系支持。
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-gray-400">错误编号：{error.digest}</p>
        )}
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          重试
        </button>
      </body>
    </html>
  )
}
