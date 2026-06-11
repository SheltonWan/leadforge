/**
 * 猪八戒自动化采集适配器（Playwright 无头浏览器）
 *
 * 使用真正的 Chrome 引擎，TLS 指纹与普通浏览器完全一致，
 * 从根本上规避猪八戒的 TLS 指纹检测与 Session 绑定安全机制。
 *
 * ⚠️ 生产部署注意：
 *   - 本地开发 / 自托管服务器：直接可用（需运行 `pnpm exec playwright install chromium`）
 *   - Vercel Serverless：不支持（函数包大小与超时限制），请改用 HTML 粘贴模式
 */

import { chromium } from 'playwright'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { parseZbjHtml } from './zbj-scraper.adapter'
import type { IngestionResult } from './ingestion-adapter.interface'

const ZBJ_LOGIN_URL = 'https://account.zbj.com/login'
const ZBJ_SEARCH_URL = 'https://www.zbj.com/xq/'

/** 持久化 session 文件路径，复用 cookie 以避免反复触发验证码 */
const STORAGE_STATE_PATH = path.join(os.tmpdir(), 'leadforge-zbj-session.json')

async function loadStorageState() {
  try {
    const raw = await fs.promises.readFile(STORAGE_STATE_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch { /* 文件不存在或损坏，忽略 */ }
  return undefined
}

async function saveStorageState(state: unknown): Promise<void> {
  await fs.promises.writeFile(STORAGE_STATE_PATH, JSON.stringify(state), 'utf-8')
}

export interface ZbjAutoConfig {
  username: string
  password: string
}

export interface ZbjIngestOptions {
  /**
   * 是否使用无头模式。
   * - true（默认）：后台运行，遇到验证码时抛出 CAPTCHA_REQUIRED 错误
   * - false：打开可见浏览器窗口，用户可以手动完成验证码
   */
  headless?: boolean
  /**
   * 手动登录模式下的最大等待时间（秒），默认 120 秒。
   * 仅在 headless=false 时生效。
   */
  manualTimeout?: number
}

/** CAPTCHA 错误 —— 前端可据此显示「手动验证」按钮 */
export class CaptchaRequiredError extends Error {
  constructor(message = '登录时触发人机验证') {
    super(message)
    this.name = 'CaptchaRequiredError'
  }
}

/**
 * 在猪八戒登录页切换到「账号密码登录」表单。
 *
 * 登录页有两套互斥的界面容器：
 *   .account-hidden-novisibility  → 账号密码登录表单（含 #username / #password）
 *   .wei-hidden-novisibility      → 微信扫码登录
 *   .app-hidden-novisibility      → APP 扫码登录
 *
 * 页面默认显示扫码界面（.wei-hidden-novisibility），账号表单被 display:none 隐藏。
 * 只需将 .account-hidden-novisibility 设为 display:block 即可显示输入框。
 */
async function switchToPasswordLoginTab(page: import('playwright').Page): Promise<void> {
  // 如果输入框已经可见，无需操作
  if (await page.locator('#username').isVisible().catch(() => false)) return

  // 等待页面 JS 完全初始化（Utopia Tabs 等组件）
  await page.waitForTimeout(2_000)

  // 策略 1：CSS 注入 + DOM 操作双管齐下
  // 注入 CSS 强制显示账号表单，隐藏扫码界面
  await page.addStyleTag({
    content: `
      .account-hidden-novisibility { display: block !important; visibility: visible !important; }
      .wei-hidden-novisibility   { display: none !important; }
      .app-hidden-novisibility   { display: none !important; }
      .login-password-panel      { display: block !important; }
      .login-mobile-panel        { display: none !important; }
      .login-con-panel           { display: none !important; }
      .scan-form-content         { display: none !important; }
    `,
  }).catch(() => {})

  // 同时用 JS 操作 DOM（处理内联 style 优先级问题）
  await page.evaluate(() => {
    const show = (sel: string) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.display = 'block'
          el.style.visibility = 'visible'
        }
      })
    }
    const hide = (sel: string) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.display = 'none'
        }
      })
    }
    show('.account-hidden-novisibility')
    show('.login-password-panel')
    hide('.wei-hidden-novisibility')
    hide('.app-hidden-novisibility')
    hide('.login-con-panel')
    hide('.scan-form-content')
    hide('.login-mobile-panel')
  })

  // 等待输入框可见
  await page.locator('#username').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})

  // 策略 2（备选）：尝试点击外层「密码登录」tab
  if (!(await page.locator('#username').isVisible().catch(() => false))) {
    const tabSelectors = [
      'li.login-by-accountpassword',
      '.login-by-account-item:has-text("密码登录")',
      'ul.login-by-account-ways >> text="密码登录"',
    ]
    for (const sel of tabSelectors) {
      const el = page.locator(sel).first()
      if (await el.isVisible().catch(() => false)) {
        await el.click()
        await page.locator('#username').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
        if (await page.locator('#username').isVisible().catch(() => false)) return
      }
    }
  }

  // 策略 3（最后备选）：JavaScript 穿透所有父级隐藏层
  if (!(await page.locator('#username').isVisible().catch(() => false))) {
    await page.evaluate(() => {
      const show = (id: string) => {
        const el = document.getElementById(id)
        if (el) {
          el.style.display = ''
          el.style.visibility = 'visible'
          let parent = el.parentElement
          while (parent) {
            if (parent.style.display === 'none') parent.style.display = 'block'
            if (parent.style.visibility === 'hidden') parent.style.visibility = 'visible'
            parent = parent.parentElement
          }
        }
      }
      show('username')
      show('password')
    })
    await page.locator('#username').waitFor({ state: 'visible', timeout: 3_000 }).catch(() => {})
  }
}

/**
 * 用账号密码登录猪八戒，抓取指定关键词和页码的任务列表。
 *
 * @param cfg    猪八戒账号密码
 * @param keyword  搜索关键词
 * @param page    页码
 * @param options.headless  是否无头模式（默认 true）
 *   - true：后台运行，遇验证码抛出 CaptchaRequiredError
 *   - false：打开可见窗口，等用户手动完成验证码后自动继续
 * @param options.manualTimeout  手动模式超时秒数（默认 120）
 */
export async function zbjAutoIngest(
  cfg: ZbjAutoConfig,
  keyword: string,
  page: number,
  options: ZbjIngestOptions = {},
): Promise<IngestionResult> {
  const { headless = true, manualTimeout = 120 } = options

  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-infobars',
      '--window-size=1280,800',
    ],
  })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    viewport: { width: 1280, height: 800 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storageState: (await loadStorageState().catch(() => undefined)) as any,
  })

  try {
    const pw = context.newPage()
    const loginPage = await pw

    // ── Step 1: Navigate to login page ────────────────────────────────────
    await loginPage.goto(ZBJ_LOGIN_URL, { waitUntil: 'networkidle', timeout: 30_000 })

    // ── Step 2: Switch to account+password login tab ──────────────────────
    await switchToPasswordLoginTab(loginPage)

    // ── Step 3: Fill credentials ──────────────────────────────────────────
    const usernameInput = loginPage.locator('#username')
    await usernameInput.waitFor({ state: 'visible', timeout: 10_000 })
    await usernameInput.fill(cfg.username)

    const passwordInput = loginPage.locator('#password')
    await passwordInput.waitFor({ state: 'visible', timeout: 5_000 })
    await passwordInput.fill(cfg.password)

    // ── Step 4: Handle CAPTCHA ────────────────────────────────────────────
    const hasCaptcha = await detectCaptcha(loginPage)
    if (hasCaptcha) {
      if (headless) {
        throw new CaptchaRequiredError('登录时触发人机验证（极验），请点击「手动验证」打开浏览器完成滑块验证')
      }
      // 非无头模式：等用户手动完成验证码
      await waitForManualCaptcha(loginPage, manualTimeout)
    }

    // ── Step 5: Agree to terms & submit ────────────────────────────────────
    const agreeCheckbox = loginPage.locator('#agree, input[name="agree"], .agree-checkbox input[type="checkbox"]').first()
    const agreeExists = await agreeCheckbox.isVisible().catch(() => false)
    if (agreeExists) {
      const isChecked = await agreeCheckbox.isChecked().catch(() => false)
      if (!isChecked) await agreeCheckbox.check()
    }

    // 如果用户已经手动登录成功（页面已跳转），跳过点击登录按钮
    if (!loginPage.url().includes('/login')) {
      console.log('[zbj-playwright] 用户已手动完成登录，跳过提交按钮')
    } else {
      const submitBtn = loginPage.locator(
        'button.j-login-btn, .j-login-btn, button:has-text("登 录"), button.zbj-btn-primary',
      ).first()
      await submitBtn.waitFor({ state: 'visible', timeout: 10_000 })
      await submitBtn.click()
    }

    // ── Step 6: Wait for login success ────────────────────────────────────
    await waitForLoginSuccess(loginPage, headless ? 20_000 : manualTimeout * 1000)

    // ── Step 7: Navigate to search results ───────────────────────────────
    const searchUrl = `${ZBJ_SEARCH_URL}?k=${encodeURIComponent(keyword)}&p=${page}`
    await loginPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // Check for CAPTCHA on search page
    const captchaOnSearch = await loginPage
      .locator('.geetest_panel, [id="captcha"], text=拖动下方滑块')
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false)
    if (captchaOnSearch) {
      throw new Error('搜索结果页触发人机验证，请稍后重试')
    }

    // ── Step 8: Get page content ──────────────────────────────────────────
    const html = await loginPage.content()

    // 持久化 session 以便下次复用
    const state = await context.storageState()
    await saveStorageState(state).catch(() => {})

    return parseZbjHtml(html)
  } finally {
    await browser.close()
  }
}

/** 检测页面是否存在极验验证码 */
async function detectCaptcha(page: import('playwright').Page): Promise<boolean> {
  return page
    .locator('.geetest_panel, .geetest_holder, [class*="geetest"], text="点击按钮进行验证"')
    .first()
    .isVisible({ timeout: 2_000 })
    .catch(() => false)
}

/**
 * 非无头模式：等待用户手动完成验证码并登录。
 * 轮询检测 URL 是否已离开登录页，最长等待 manualTimeout 秒。
 */
async function waitForManualCaptcha(
  page: import('playwright').Page,
  timeoutSeconds: number,
): Promise<void> {
  console.log('[zbj-playwright] ⚠️ 检测到极验验证码，请在打开的浏览器窗口中手动完成验证')
  console.log('[zbj-playwright] 完成验证后点击「登 录」按钮，程序将自动继续…')

  const deadline = Date.now() + timeoutSeconds * 1000
  while (Date.now() < deadline) {
    await page.waitForTimeout(2_000)
    // 检查是否已离开登录页
    const url = page.url()
    if (!url.includes('/login') && !url.includes('account.zbj.com/login')) {
      console.log('[zbj-playwright] ✅ 登录成功，继续采集…')
      return
    }
    // 如果验证码消失了但还在登录页，尝试自动点击登录
    const hasCaptcha = await detectCaptcha(page)
    if (!hasCaptcha) {
      console.log('[zbj-playwright] 验证码已通过，自动提交登录…')
      const submitBtn = page.locator(
        'button.j-login-btn, .j-login-btn, button:has-text("登 录"), button.zbj-btn-primary',
      ).first()
      const visible = await submitBtn.isVisible().catch(() => false)
      if (visible) {
        await submitBtn.click().catch(() => {})
      }
    }
  }
  throw new Error('手动登录超时，请重试')
}

/** 等待登录成功（URL 离开登录页） */
async function waitForLoginSuccess(
  page: import('playwright').Page,
  timeoutMs: number,
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

  await page
    .waitForURL(
      (url) =>
        !url.toString().includes('account.zbj.com/login') &&
        !url.toString().includes('/login'),
      { timeout: timeoutMs },
    )
    .catch(() => {})

  const currentUrl = page.url()
  if (currentUrl.includes('/login')) {
    // 检查错误
    const captcha = await detectCaptcha(page)
    if (captcha) {
      throw new CaptchaRequiredError('登录时触发人机验证（极验），请点击「手动验证」打开浏览器完成滑块验证')
    }
    const pageText = (await page.textContent('body').catch(() => '')) ?? ''
    if (pageText.includes('验证码') || pageText.includes('滑块') || pageText.includes('拖动')) {
      throw new CaptchaRequiredError('登录时触发人机验证，请点击「手动验证」打开浏览器完成滑块验证')
    }
    const errEl = page.locator('[class*="error"], [class*="err"], .msg-error, .login-error').first()
    const errText = await errEl.textContent().catch(() => '')
    if (errText) {
      throw new Error(`猪八戒登录失败：${errText.trim()}`)
    }
    throw new Error('猪八戒登录失败：账号或密码错误，请检查后重新保存凭证')
  }
}
