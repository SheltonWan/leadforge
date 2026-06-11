# LeadForge

合规 B2B 商机雷达 —— 为小型软件服务商发现公开定制开发需求、评估匹配度、生成个性化 outreach 邮件草稿，并跟踪跟进进度。

## 这是什么？

LeadForge 帮助独立开发者和小型软件团队用**合规**的方式从公开渠道发现潜在客户：

- 🔍 **发现商机**：从公开来源（CSV 导入、手动录入、公开 API）收集定制开发需求信号
- 🎯 **智能评分**：根据服务匹配度、预算、紧急程度、地域等因素评估线索质量
- ✍️ **Outreach 草稿**：生成引用你的网站和案例的个性化邮件草稿（含退订声明）
- 📊 **CRM 跟踪**：从 new → reviewed → draft → sent → replied → won/lost，全流程管理
- 🛡️ **合规优先**：遵循 PIPL（个保法），不爬取非公开数据，不自动群发

> **不是**邮件群发工具、爬虫工具、或 CRM 系统。它是一个专注于**公开需求发现 + 合规触达**的商机雷达。

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Next.js 15 (App Router) + TypeScript |
| UI | React 19 + Tailwind CSS |
| 数据库/认证/存储 | Supabase |
| AI | OpenAI（可选，默认使用启发式评分） |
| 部署 | Vercel + Supabase |
| 测试 | Vitest |
| 校验 | Zod |

## 项目结构

```
leadforge/
├── src/
│   ├── app/                  # Next.js App Router 页面与 API 路由
│   ├── adapters/             # AI 评分 / 来源接入 / Outreach 草稿适配器
│   ├── components/           # 共享 UI 组件
│   ├── features/             # 功能模块
│   ├── shared/               # 共享工具、常量、校验
│   ├── lib/                  # 库封装（Supabase 客户端等）
│   └── types/                # TypeScript 类型定义
├── supabase/
│   └── migrations/           # 数据库迁移文件
├── docs/product/leadforge/   # 产品文档（PRD / 架构 / 构建计划）
├── vercel.json               # Vercel 部署配置
├── vitest.config.ts          # 测试配置
└── package.json
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm typecheck

# 运行测试
pnpm test
```

### 环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-key    # 可选，不设置则使用启发式评分
```

## 产品文档

完整产品文档位于 [`docs/product/leadforge/`](../docs/product/leadforge/)：

| 文档 | 说明 |
|---|---|
| 01-overview.md | 产品概述与定位 |
| 02-competitor-analysis.md | 竞品分析 |
| 03-prd-options.md | PRD 方案选项 |
| 04-selected-prd.md | 选定的 PRD |
| 05-prototype-brief.md | 原型方案 |
| 06-architecture.md | 技术架构 |
| 07-implementation-backlog.md | 实现待办列表 |
| 08-build-plan.md | 构建计划 |

## 合规原则

- ✅ 仅使用公开/授权/用户提供的数据来源
- ✅ 所有 outreach 需人工审核后手动发送
- ✅ 每封邮件包含真实发件人身份和退订说明
- ❌ 不爬取需登录/验证码/付费墙后的内容
- ❌ 不获取非公开的个人邮箱或电话
- ❌ 不做自动批量群发或冷邮件序列
