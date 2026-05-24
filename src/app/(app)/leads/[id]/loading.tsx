/**
 * Loading skeleton for the lead detail page.
 * Shown while the Server Component fetches lead + AI summary in parallel.
 */
export default function LeadDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6" aria-label="加载中">
      {/* Back link + title */}
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
        <div className="h-7 w-3/5 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          {[120, 80, 80, 60].map((h, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-200 bg-white"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        {/* Sidebar */}
        <div className="space-y-4">
          {[100, 140, 80].map((h, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-200 bg-white"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
