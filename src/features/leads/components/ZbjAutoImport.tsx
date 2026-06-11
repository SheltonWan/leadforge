'use client'

import { useState, useEffect } from 'react'

interface CredentialStatus {
  configured: boolean
  username: string | null
  error?: string
}

interface ImportResult {
  imported: number
  skipped: number
  hasMore: boolean
  parsed: number
}

interface ApiError {
  error?: { code?: string; message: string }
}

export function ZbjAutoImport() {
  const [credStatus, setCredStatus] = useState<CredentialStatus | null>(null)
  const [showCredForm, setShowCredForm] = useState(false)

  // Credential form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [credSaving, setCredSaving] = useState(false)
  const [credError, setCredError] = useState<string | null>(null)

  // Scrape form state
  const [keyword, setKeyword] = useState('小程序开发')
  const [page, setPage] = useState(1)
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<ImportResult | null>(null)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [captchaDetected, setCaptchaDetected] = useState(false)

  // Load credential status on mount
  useEffect(() => {
    fetch('/api/profile/zbj-credentials')
      .then((r) => r.json())
      .then((data: CredentialStatus) => {
        setCredStatus(data)
        if (!data.configured) setShowCredForm(true)
      })
      .catch(() => setCredStatus({ configured: false, username: null }))
  }, [])

  async function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault()
    setCredSaving(true)
    setCredError(null)
    try {
      const res = await fetch('/api/profile/zbj-credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = (await res.json()) as { ok?: boolean; username?: string; error?: { message: string } }
      if (!res.ok || data.error) {
        setCredError(data.error?.message ?? '保存失败')
      } else {
        setCredStatus({ configured: true, username: data.username ?? username })
        setShowCredForm(false)
        setPassword('')
      }
    } catch {
      setCredError('网络错误，请重试')
    } finally {
      setCredSaving(false)
    }
  }

  async function handleClearCredentials() {
    await fetch('/api/profile/zbj-credentials', { method: 'DELETE' })
    setCredStatus({ configured: false, username: null })
    setShowCredForm(true)
    setUsername('')
    setPassword('')
  }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault()
    setScraping(true)
    setScrapeResult(null)
    setScrapeError(null)
    setCaptchaDetected(false)
    try {
      const res = await fetch('/api/ingest/zbj/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, page, risk_level: riskLevel }),
      })
      const data = (await res.json()) as ApiError & Partial<ImportResult>
      if (!res.ok || data.error) {
        if (data.error?.code === 'CAPTCHA_REQUIRED') {
          setCaptchaDetected(true)
          setScrapeError(data.error.message)
        } else {
          setScrapeError(data.error?.message ?? `请求失败 (${res.status})`)
        }
      } else {
        setScrapeResult(data as ImportResult)
      }
    } catch {
      setScrapeError('网络错误，请重试')
    } finally {
      setScraping(false)
    }
  }

  /** 打开可见浏览器窗口，让用户手动完成验证码 */
  async function handleManualLogin() {
    setScraping(true)
    setScrapeError(null)
    setCaptchaDetected(false)
    try {
      const res = await fetch('/api/ingest/zbj/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, page, risk_level: riskLevel, manual: true }),
      })
      const data = (await res.json()) as ApiError & Partial<ImportResult>
      if (!res.ok || data.error) {
        if (data.error?.code === 'CAPTCHA_REQUIRED') {
          setCaptchaDetected(true)
          setScrapeError(data.error.message)
        } else {
          setScrapeError(data.error?.message ?? `请求失败 (${res.status})`)
        }
      } else {
        setScrapeResult(data as ImportResult)
      }
    } catch {
      setScrapeError('网络错误，请重试')
    } finally {
      setScraping(false)
    }
  }

  if (credStatus === null) {
    return <p className="text-sm text-gray-400">加载中…</p>
  }

  return (
    <div className="space-y-6">
      {/* ── Credential section ────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">猪八戒账号</p>
            {credStatus.configured ? (
              <p className="mt-0.5 text-xs text-green-600">
                已配置：{credStatus.username}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-gray-400">未配置，请填写下方账号信息</p>
            )}
          </div>
          {credStatus.configured && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCredForm(!showCredForm)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                {showCredForm ? '收起' : '修改'}
              </button>
              <button
                onClick={handleClearCredentials}
                className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                清除
              </button>
            </div>
          )}
        </div>

        {showCredForm && (
          <form onSubmit={handleSaveCredentials} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  账号 / 手机号
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="猪八戒登录账号"
                  required
                  autoComplete="username"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="猪八戒登录密码"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>
            </div>
            {credError && (
              <p className="text-xs text-red-600">{credError}</p>
            )}
            <p className="text-xs text-gray-400">
              密码经 AES-256-GCM 加密后存储，服务端持有密钥，明文不落地。
            </p>
            <button
              type="submit"
              disabled={credSaving}
              className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {credSaving ? '保存中…' : '保存凭证'}
            </button>
          </form>
        )}
      </div>

      {/* ── Scrape trigger ────────────────────────────────────────────── */}
      {credStatus.configured && (
        <form onSubmit={handleScrape} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">关键词</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="如：小程序开发、H5 制作"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">页码</label>
              <input
                type="number"
                value={page}
                min={1}
                max={50}
                onChange={(e) => setPage(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">风险等级</label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              <option value="low">低风险</option>
              <option value="medium">中风险</option>
              <option value="high">高风险</option>
            </select>
          </div>

          {scrapeError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p>{scrapeError}</p>
              {captchaDetected && (
                <button
                  type="button"
                  onClick={handleManualLogin}
                  disabled={scraping}
                  className="mt-2 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {scraping ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      等待手动验证中（最多 2 分钟）…
                    </>
                  ) : (
                    '🖥️ 打开浏览器手动验证'
                  )}
                </button>
              )}
            </div>
          )}

          {scrapeResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">采集完成</p>
              <p className="mt-1">
                解析到 <strong>{scrapeResult.parsed}</strong> 条 · 成功导入{' '}
                <strong>{scrapeResult.imported}</strong> 条 · 跳过重复{' '}
                <strong>{scrapeResult.skipped}</strong> 条
                {scrapeResult.hasMore && (
                  <span>
                    {' '}· 还有更多，可将页码改为 <strong>{page + 1}</strong> 继续采集
                  </span>
                )}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={scraping}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scraping && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {scraping ? '浏览器自动登录中，请稍候（约 15-30 秒）…' : '一键自动采集'}
          </button>
        </form>
      )}
    </div>
  )
}
