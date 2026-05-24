/**
 * Loading skeleton for the leads list page.
 * Shown while the Server Component fetches leads data.
 */
export default function LeadsLoading() {
  return (
    <div className="space-y-4 p-6" aria-label="加载中">
      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        {[80, 96, 80, 64].map((w, i) => (
          <div
            key={i}
            className="h-9 animate-pulse rounded-lg bg-gray-200"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-2/5 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-1/6 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-1/8 animate-pulse rounded bg-gray-200" />
              <div className="ml-auto h-6 w-16 animate-pulse rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
