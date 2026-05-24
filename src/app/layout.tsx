import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    template: '%s — LeadForge',
    default: 'LeadForge',
  },
  description: '合规 B2B 商机雷达 — 帮助软件服务商发现公开需求、评估商机、生成外联草稿',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
