import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/features/profile/profile.repository'
import { ProfileForm } from '@/features/profile/components/ProfileForm'

export const metadata: Metadata = { title: '服务档案' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // user is guaranteed by (app)/layout.tsx — catch DB errors gracefully
  const profile = user ? await getProfile(supabase, user.id).catch(() => null) : null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">服务档案</h1>
        <p className="mt-1 text-sm text-gray-500">
          填写完整服务档案后，LeadForge 可以更精准地评分，并生成个性化外联草稿。
          <strong className="font-medium text-gray-700">网站地址是生成草稿的必需条件。</strong>
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-8">
        <ProfileForm initialProfile={profile} />
      </div>
    </div>
  )
}
