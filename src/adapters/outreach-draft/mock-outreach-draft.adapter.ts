import type { OutreachDraftAdapter, DraftGeneratorContext, DraftGeneratorResult } from './outreach-draft-adapter.interface'

export class MockOutreachDraftAdapter implements OutreachDraftAdapter {
  async generate({ lead, profile }: DraftGeneratorContext): Promise<DraftGeneratorResult> {
    const services = profile.services.length > 0
      ? profile.services.join('、')
      : '软件开发服务'

    const websiteUrl = profile.website_url || 'https://example.com'
    const companyName = profile.company_name || '我们的团队'

    // Case snippet: first 80 chars of case_snippets if present
    const caseExcerpt = profile.case_snippets?.trim()
      ? profile.case_snippets.trim().slice(0, 80) + (profile.case_snippets.trim().length > 80 ? '…' : '')
      : null

    const subject = `关于「${lead.title}」的服务合作咨询`

    const bodyLines = [
      `您好，`,
      ``,
      `我们关注到您发布的「${lead.title}」需求，${lead.budget_text ? `预算 ${lead.budget_text}，` : ''}${lead.location ? `地区 ${lead.location}，` : ''}感谢您的分享。`,
      ``,
      `${companyName} 专注于 ${services}，已帮助多个团队完成类似项目的落地交付。${caseExcerpt ? `典型案例：${caseExcerpt}` : ''}`,
      ``,
      `如果您目前仍在评估合作伙伴，欢迎访问我们的官网了解更多详情：${websiteUrl}`,
      ``,
      `我们很乐意围绕您的具体需求做进一步沟通，方便的话请回复此邮件，或通过官网联系我们。`,
      ``,
      `【免打扰声明】如不希望收到此类邮件，请直接回复"取消"，我们将立即停止联系，感谢理解。`,
      ``,
      `此致`,
      companyName,
    ]

    return {
      subject,
      body: bodyLines.join('\n'),
      model_version: 'mock-draft-v1',
    }
  }
}
