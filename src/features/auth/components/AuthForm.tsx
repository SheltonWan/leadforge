'use client'

import { useActionState, useState } from 'react'
import { signIn, signUp } from '../auth.actions'

type Mode = 'signin' | 'signup'
type ActionState = { error?: string; success?: string }

const INITIAL_STATE: ActionState = {}

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin')

  const [signinState, signinAction, signinPending] = useActionState(signIn, INITIAL_STATE)
  const [signupState, signupAction, signupPending] = useActionState(signUp, INITIAL_STATE)

  const isSignin = mode === 'signin'
  const state = isSignin ? signinState : signupState
  const isPending = isSignin ? signinPending : signupPending

  function switchMode(e: React.MouseEvent) {
    e.preventDefault()
    setMode(isSignin ? 'signup' : 'signin')
  }

  return (
    <form
      action={isSignin ? signinAction : signupAction}
      noValidate
      className="space-y-4"
      aria-label={isSignin ? '登录表单' : '注册表单'}
    >
      <div>
        <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">
          邮箱
        </label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete={isSignin ? 'username' : 'email'}
          required
          placeholder="you@example.com"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div>
        <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">
          密码{!isSignin && <span className="text-gray-400 font-normal ml-1">（至少 8 位）</span>}
        </label>
        <input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={isSignin ? 'current-password' : 'new-password'}
          required
          minLength={isSignin ? undefined : 8}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {state.error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      {state.success && (
        <p role="status" aria-live="polite" className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? '请稍候…' : isSignin ? '登录' : '注册'}
      </button>

      <p className="text-center text-sm text-gray-500">
        {isSignin ? '还没有账号？' : '已有账号？'}
        <button
          onClick={switchMode}
          className="ml-1 text-sky-600 hover:text-sky-800 font-medium focus:outline-none focus:underline"
        >
          {isSignin ? '立即注册' : '返回登录'}
        </button>
      </p>
    </form>
  )
}
