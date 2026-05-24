'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: '看板' },
  { href: '/leads', label: '商机线索' },
  { href: '/sources', label: '来源管理' },
  { href: '/pipeline', label: '跟进看板' },
  { href: '/settings/profile', label: '服务档案' },
  { href: '/settings/suppression', label: '屏蔽名单' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav
      className="flex h-screen w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white"
      aria-label="主导航"
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-4">
        <span className="text-base font-semibold text-gray-900">LeadForge</span>
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
          MVP
        </span>
      </div>

      {/* Nav links */}
      <ul className="flex flex-1 flex-col gap-0.5 p-2" role="list">
        {navItems.map(({ href, label }) => {
          const isActive =
            pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <li key={href}>
              <Link
                href={href}
                className={[
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Footer note */}
      <div className="border-t border-gray-100 p-3">
        <p className="text-center text-xs text-gray-400">Milestone 1</p>
      </div>
    </nav>
  )
}
