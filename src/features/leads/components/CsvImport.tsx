'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { leadCreateSchema, CSV_HEADERS } from '../leads.types'
import type { LeadCreateData } from '../leads.types'

// ─── CSV parsing ──────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

type ValidRow = { index: number; data: LeadCreateData; valid: true }
type InvalidRow = {
  index: number
  raw: Record<string, string>
  errors: string[]
  valid: false
}
type ParsedRow = ValidRow | InvalidRow

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())

  return lines.slice(1).map((line, i): ParsedRow => {
    const values = parseCsvLine(line)
    const raw: Record<string, string> = {}
    headers.forEach((h, j) => {
      raw[h] = values[j]?.trim() ?? ''
    })

    const parsed = leadCreateSchema.safeParse({
      title: raw['title'] ?? '',
      description: raw['description'] ?? '',
      source_url: raw['source_url'] ?? '',
      budget_text: raw['budget_text'] ?? '',
      location: raw['location'] ?? '',
      industry: raw['industry'] ?? '',
      published_at: raw['published_at'] || null,
      source_type: raw['source_type'] || 'csv_import',
      collection_method: raw['collection_method'] || 'csv_import',
      risk_level: raw['risk_level'] || 'low',
      tos_note: raw['tos_note'] ?? '',
    })

    if (parsed.success) {
      return { index: i + 2, data: parsed.data, valid: true as const }
    }

    const errs = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter((v): v is string => typeof v === 'string')

    return { index: i + 2, raw, errors: errs, valid: false as const }
  })
}

// ─── CSV template download ────────────────────────────────────────────────────

const TEMPLATE_ROW =
  '某企业寻求定制 CRM 系统,需要微信小程序前端和后台管理,https://example.com/post/1,10-20万,北京,零售,2026-05-24,manual,manual_copy,low,来自公开社区论坛'

function downloadTemplate() {
  const content = [CSV_HEADERS.join(','), TEMPLATE_ROW].join('\n')
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'leadforge-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function riskLabel(risk: LeadCreateData['risk_level']) {
  return risk === 'high' ? '高' : risk === 'medium' ? '中' : '低'
}
function riskCls(risk: LeadCreateData['risk_level']) {
  return risk === 'high'
    ? 'font-medium text-red-600'
    : risk === 'medium'
      ? 'text-amber-600'
      : 'text-green-600'
}

// ─── Component ────────────────────────────────────────────────────────────────

type ImportResult = { created: number; errors: string[]; total: number }

export function CsvImport() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const validRows = rows.filter((r): r is ValidRow => r.valid)
  const invalidRows = rows.filter((r): r is InvalidRow => !r.valid)

  function handleFile(file: File) {
    setFileError('')
    setResult(null)
    setRows([])
    setFileName(file.name)

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('请上传 .csv 格式文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) ?? ''
        const parsed = parseCsv(text)
        if (parsed.length === 0) {
          setFileError('文件为空或仅含标题行，请检查文件内容')
          return
        }
        setRows(parsed)
      } catch {
        setFileError('文件解析失败，请检查格式是否正确')
      }
    }
    reader.onerror = () => setFileError('文件读取失败，请重试')
    reader.readAsText(file, 'utf-8')
  }

  async function handleImport() {
    if (validRows.length === 0) return
    setImporting(true)
    setFileError('')

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows.map((r) => r.data) }),
      })

      const json = (await res.json()) as {
        created?: number
        errors?: string[]
        total?: number
        error?: { message?: string }
      }

      if (!res.ok) {
        setFileError(json?.error?.message ?? '导入失败，请重试')
        return
      }

      setResult({
        created: json.created ?? 0,
        errors: json.errors ?? [],
        total: json.total ?? 0,
      })
      router.refresh()
    } catch {
      setFileError('网络错误，请重试')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1 — template */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-700">下载 CSV 模板</p>
          <p className="text-xs text-gray-500">包含所有字段说明和示例行</p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          下载模板
        </button>
      </div>

      {/* Step 2 — file upload */}
      <div>
        <p className="mb-1 block text-sm font-medium text-gray-700">
          上传 CSV 文件
          <span className="ml-1 text-xs font-normal text-gray-400">（最多 500 行）</span>
        </p>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="点击或拖拽上传 CSV 文件"
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 transition-colors hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileRef.current?.click()
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
        >
          <svg
            className="mb-2 h-7 w-7 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          {fileName ? (
            <p className="text-sm font-medium text-sky-600">{fileName}</p>
          ) : (
            <p className="text-sm text-gray-500">点击上传或将 CSV 文件拖拽到此处</p>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          aria-label="选择 CSV 文件"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />

        {fileError && (
          <p role="alert" aria-live="polite" className="mt-1 text-xs text-red-600">
            {fileError}
          </p>
        )}
      </div>

      {/* Step 3 — preview */}
      {rows.length > 0 && !result && (
        <div className="space-y-3">
          <div
            className="flex flex-wrap items-center gap-4 text-sm"
            role="status"
            aria-live="polite"
          >
            <span className="font-medium text-gray-700">共解析 {rows.length} 行</span>
            <span className="text-green-600">✓ {validRows.length} 行有效</span>
            {invalidRows.length > 0 && (
              <span className="text-red-600">✗ {invalidRows.length} 行有误（将跳过）</span>
            )}
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['行号', '标题', '来源链接', '风险', '状态'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-3 py-2 text-left font-medium text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.slice(0, 30).map((row) => (
                  <tr key={row.index} className={row.valid ? '' : 'bg-red-50'}>
                    <td className="px-3 py-2 text-gray-400">{row.index}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 font-medium text-gray-900">
                      {row.valid ? row.data.title : (row.raw['title'] || '—')}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-gray-400">
                      {row.valid
                        ? (row.data.source_url || '—')
                        : (row.raw['source_url'] || '—')}
                    </td>
                    <td className={`px-3 py-2 ${row.valid ? riskCls(row.data.risk_level) : 'text-gray-400'}`}>
                      {row.valid ? riskLabel(row.data.risk_level) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {row.valid ? (
                        <span className="text-green-600">✓ 有效</span>
                      ) : (
                        <span className="text-red-600" title={row.errors.join('; ')}>
                          ✗ {row.errors[0] ?? '格式错误'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 30 && (
              <p className="px-3 py-2 text-center text-xs text-gray-400">
                仅预览前 30 行，共 {rows.length} 行
              </p>
            )}
          </div>

          {/* Invalid row details */}
          {invalidRows.length > 0 && (
            <details className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs">
              <summary className="cursor-pointer font-medium text-red-700">
                查看 {invalidRows.length} 行错误详情
              </summary>
              <ul className="mt-2 space-y-1 text-red-600">
                {invalidRows.slice(0, 20).map((row) => (
                  <li key={row.index}>
                    第 {row.index} 行（&ldquo;{row.raw['title'] || '空标题'}&rdquo;）：
                    {row.errors.join('；')}
                  </li>
                ))}
                {invalidRows.length > 20 && (
                  <li className="text-gray-400">……还有 {invalidRows.length - 20} 行错误</li>
                )}
              </ul>
            </details>
          )}

          {validRows.length > 0 && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              aria-disabled={importing}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? '导入中…' : `导入 ${validRows.length} 行有效数据`}
            </button>
          )}
        </div>
      )}

      {/* Step 4 — result */}
      {result && (
        <div
          role="status"
          aria-live="polite"
          className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4"
        >
          <p className="text-sm font-medium text-green-700">
            ✓ 成功导入 {result.created} 条线索
            {result.errors.length > 0 && `，${result.errors.length} 行失败`}
          </p>

          {result.errors.length > 0 && (
            <details className="text-xs text-red-600">
              <summary className="cursor-pointer font-medium">
                {result.errors.length} 行导入失败
              </summary>
              <ul className="mt-1 space-y-0.5">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}

          <button
            type="button"
            onClick={() => router.push('/leads')}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          >
            查看线索列表
          </button>
        </div>
      )}
    </div>
  )
}
