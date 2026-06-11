'use client'

import { useState } from 'react'
import { LeadCreateForm } from './LeadCreateForm'
import { CsvImport } from './CsvImport'
import { ZbjAutoImport } from './ZbjAutoImport'
import { ZbjHtmlImport } from './ZbjHtmlImport'

type Tab = 'manual' | 'csv' | 'zbj' | 'zbj-html'

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'manual', label: '手动录入', desc: '逐条填写线索信息' },
  { id: 'csv', label: 'CSV 批量导入', desc: '上传表格批量导入' },
  { id: 'zbj', label: '猪八戒自动采集', desc: '账号登录，一键抓取' },
  { id: 'zbj-html', label: '猪八戒源码导入', desc: '粘贴页面源码（备用）' },
]

function cls(...args: (string | false | undefined)[]) {
  return args.filter(Boolean).join(' ')
}

export function ImportTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('manual')

  return (
    <div>
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="导入方式"
        className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cls(
                'flex flex-1 flex-col items-start rounded-lg px-4 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1',
                isActive
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-white/60',
              )}
            >
              <span
                className={cls(
                  'text-sm font-medium',
                  isActive ? 'text-sky-700' : 'text-gray-600',
                )}
              >
                {tab.label}
              </span>
              <span className="text-xs text-gray-400">{tab.desc}</span>
            </button>
          )
        })}
      </div>

      {/* Tab panels */}
      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
        >
          {tab.id === 'manual' ? (
            <LeadCreateForm />
          ) : tab.id === 'zbj' ? (
            <ZbjAutoImport />
          ) : tab.id === 'zbj-html' ? (
            <ZbjHtmlImport />
          ) : (
            <CsvImport />
          )}
        </div>
      ))}
    </div>
  )
}
