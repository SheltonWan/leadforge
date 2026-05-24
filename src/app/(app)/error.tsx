'use client'

import { useEffect } from 'react'

/**
 * App-shell error boundary.
 * Catches unhandled errors inside the authenticated (app) layout.
 * Rendered by Next.js App Router when an error propagates past a Server Component.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console in development; swap for a real error reporter in production
    console.error('[AppError boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
        <svg
          aria-hidden="true"
          className="h-7 w-7 text-red-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">页面加载出错</h2>
      <p className="max-w-sm text-sm text-gray-500">
        发生了一个意外错误。请尝试刷新页面，或点击下方按钮重试。
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-gray-400">错误编号：{error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        重试
      </button>
    </div>
  )
}
