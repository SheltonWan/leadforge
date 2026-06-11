'use client'

import { useState } from 'react'

interface ImportResult {
  imported: number
  skipped: number
  hasMore: boolean
  parsed: number
}

export function ZbjHtmlImport() {
  const [html, setHtml] = useState('')
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/ingest/zbj/parse-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, risk_level: riskLevel }),
      })
      const data = (await res.json()) as { error?: { message: string } } & Partial<ImportResult>
      if (!res.ok || data.error) {
        setError(data.error?.message ?? `请求失败 (${res.status})`)
      } else {
        setResult(data as ImportResult)
        setHtml('')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Instructions */}
      <div className="rounded-lg border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
        <p className="font-medium">操作步骤（无需复制 Cookie，不触发安全检测）：</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            在浏览器登录猪八戒，打开任务搜索页（如{' '}
            <a
              href="https://www.zbj.com/xq/?k=小程序开发&p=1"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              小程序开发
            </a>
            ）
          </li>
          <li>
            按 <kbd className="rounded border border-sky-300 bg-white px-1 py-0.5 font-mono text-xs">Ctrl+U</kbd>（Mac：<kbd className="rounded border border-sky-300 bg-white px-1 py-0.5 font-mono text-xs">⌘+Option+U</kbd>）打开页面源码
          </li>
          <li>全选（Ctrl+A / ⌘+A）并复制，粘贴到下方文本框</li>
          <li>点击「开始解析并导入」</li>
        </ol>
      </div>

      {/* HTML textarea */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          页面源码 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="粘贴从猪八戒任务列表页复制的完整 HTML 源码…"
          rows={8}
          required
          className="w-full rounded-lg border border-gray-300 p-3 font-mono text-xs text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
        {html.length > 0 && (
          <p className="mt-1 text-xs text-gray-400">已输入 {html.length.toLocaleString()} 字符</p>
        )}
      </div>

      {/* Risk level */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">风险等级</label>
        <select
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        >
          <option value="low">低风险</option>
          <option value="medium">中风险</option>
          <option value="high">高风险</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">导入完成</p>
          <p className="mt-1">
            解析到 <strong>{result.parsed}</strong> 条 · 成功导入{' '}
            <strong>{result.imported}</strong> 条 · 跳过重复{' '}
            <strong>{result.skipped}</strong> 条
            {result.hasMore && ' · 还有更多页，请翻页后重复操作'}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || html.length < 100}
        className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? '解析中…' : '开始解析并导入'}
      </button>
    </form>
  )
}
