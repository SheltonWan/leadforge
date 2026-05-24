import Link from 'next/link'

interface PaginationProps {
  currentPage: number
  totalPages: number
  prevHref: string | null
  nextHref: string | null
  summary: string
}

export function Pagination({
  currentPage,
  totalPages,
  prevHref,
  nextHref,
  summary,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const baseBtn =
    'inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1'
  const activeBtn = `${baseBtn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`
  const disabledBtn = `${baseBtn} border-gray-200 bg-gray-50 text-gray-300 cursor-default pointer-events-none`

  return (
    <nav
      aria-label="分页导航"
      className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3"
    >
      <p className="text-sm text-gray-500">{summary}</p>

      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link href={prevHref} className={activeBtn} aria-label="上一页">
            ← 上一页
          </Link>
        ) : (
          <span className={disabledBtn} aria-disabled="true">
            ← 上一页
          </span>
        )}

        <span className="text-sm text-gray-500 tabular-nums">
          {currentPage} / {totalPages}
        </span>

        {nextHref ? (
          <Link href={nextHref} className={activeBtn} aria-label="下一页">
            下一页 →
          </Link>
        ) : (
          <span className={disabledBtn} aria-disabled="true">
            下一页 →
          </span>
        )}
      </div>
    </nav>
  )
}
