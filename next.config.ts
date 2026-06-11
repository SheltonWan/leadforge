import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // Playwright 及其插件不能被 Turbopack/webpack 打包，必须标记为外部依赖
  serverExternalPackages: ['playwright', 'playwright-extra', 'puppeteer-extra-plugin-stealth'],
}

export default nextConfig
