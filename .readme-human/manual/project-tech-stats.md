下面按“功能模块 → 该用的技术/模式 → 你会踩到的典型坑（=成熟心智模型）”来写，尽量贴近你 BabyLog 的栈（Next.js / Vercel / Neon Postgres + Drizzle / Clerk(+Stripe) / shadcn + Tailwind）。

⸻

1) Landing / SEO / Blog

用什么技术
	•	Next.js App Router：app/(marketing) + generateMetadata() + sitemap.ts + robots.ts
	•	内容：早期用 MDX（contentlayer 或 next-mdx-remote），后期再上 CMS（可选）
	•	结构化数据：JSON-LD（Article/FAQPage/SoftwareApplication）

你会踩的坑
	•	动态内容导致 SEO 不稳定：哪些必须 SSR/SSG，哪些可 CSR
	•	缓存策略：ISR / revalidate / CDN 缓存命中与失效
	•	多语言/URL 结构（如果以后做）与 canonical

⸻

2) Auth / Session / 用户模型

用什么技术
	•	Clerk：Auth、Session、Organizations（如果未来做多宝宝/家庭协作）
	•	Next.js middleware：保护路由、做“登录态 → 重定向”
	•	DB 用户表：只存 clerk_user_id + 你自己的业务字段（profile、偏好设置等）

你会踩的坑
	•	身份系统 vs 业务用户分层：Clerk 管登录，DB 管业务数据
	•	Server Components 里取 user、API route 里校验 token 的正确姿势
	•	权限模型：单用户、家庭协作、共享数据时怎么设计（RBAC/ABAC）

⸻

3) 数据模型（Baby / Feed / Sleep / Diaper …）

用什么技术
	•	Neon Postgres + Drizzle ORM：强约束 schema + migration
	•	关键表：babies、events（或按类型拆表）、event_templates（你的“快捷按钮”会用到）
	•	事件写入：append-only（日志型）+ 可撤销（soft delete 或 “undo window”）

你会踩的坑
	•	时间字段：统一用 UTC 存，展示用用户时区；跨日统计别用 naive date
	•	一致性：撤销/编辑如何留审计（成熟 SaaS 会留 created_at/updated_at/deleted_at, actor_id）
	•	索引策略：按 user_id + baby_id + start_time 走复合索引，否则 dashboard 会慢

⸻

4) Dashboard（Tabs、列表、统计、快捷记录）

用什么技术
	•	UI：shadcn Tabs + Command/Combobox（做快速输入）
	•	数据：Server Actions / Route Handlers + React Query（或 SWR）做客户端刷新体验
	•	“快捷按钮排序”：在 DB 存 template_usage_count 或 “最近 30 天使用次数”（聚合/物化）

你会踩的坑
	•	读写分离思维：写是事件流，读是聚合视图（统计页要预聚合，不要每次全表扫）
	•	乐观更新/撤销：点击就记一条，再给 5–10 秒 Undo（典型产品体验）
	•	并发写入：手机连点、网络重试导致重复写，必须有幂等策略（见第 7 点）

⸻

5) Onboarding（你要的“默认值、无需预设”）

用什么技术
	•	First-login hook：在用户首次进入 app 时创建默认 baby、默认模板
	•	用 DB transaction 确保“一次性初始化”
	•	Clerk user metadata（可选）存 onboarded=true，或 DB 里存

你会踩的坑
	•	竞态条件：用户同时开两次页面导致重复初始化
	•	“默认一切”后续扩展：以后加 birthday/多宝宝/家庭成员，不要把默认逻辑写死在 UI

⸻

6) Subscription / Pricing / Paywall

用什么技术
	•	方案 A（你提到的）：Clerk Billing（底层还是 Stripe），你只处理授权与状态展示
	•	方案 B（更“踩坑式”成熟）：自己接 Stripe（Checkout + Customer Portal + Webhooks），Clerk 只做登录
	•	DB：subscriptions 表存 status/plan/stripe_customer_id/subscription_id/current_period_end

你会踩的坑（这块最“公司化”）
	•	订阅状态不可信前端：以 webhook 落库为准（支付成功≠你已拿到状态）
	•	升级/降级/取消/退款的状态机
	•	试用期/宽限期设计与权限判断（paywall 不要全写在 UI，必须在 API 层拦）

⸻

7) Webhooks / 幂等 / 事件驱动（成熟 SaaS 必修）

用什么技术
	•	Next.js Route Handler：POST /api/webhooks/stripe
	•	校验签名 + 幂等处理（用 event.id 去重）
	•	写入 DB：webhook_events（存已处理 event_id）

你会踩的坑
	•	重复投递是常态：不做幂等必炸
	•	处理顺序不保证：先 invoice.paid 后 customer.subscription.updated 都可能
	•	本地/预发测试：你得搭 webhook 转发（Stripe CLI）和环境隔离策略

⸻

8) Background Jobs（统计、日报、清理、异步任务）

用什么技术（Vercel 生态）
	•	Vercel Cron + API route：每天/每小时跑聚合
	•	队列：Upstash Redis + QStash（或 BullMQ 自建，但 Vercel 上更麻烦）
	•	场景：生成 daily summary、清理旧数据、预计算 usage 排序

你会踩的坑
	•	Serverless 无常驻进程：别指望 in-memory queue
	•	任务幂等：cron 重跑、超时重试都要可重复执行
	•	长任务超时：拆分批次 + checkpoint

⸻

9) 文件与资产（头像、导出 PDF/CSV）

用什么技术
	•	对象存储：S3 / R2（Cloudflare R2 很常见）+ presigned URL 上传
	•	导出：后台生成 CSV/PDF（按需），存到对象存储，再给下载链接

你会踩的坑
	•	权限：别让用户能猜到 URL 就下载别人文件（签名 URL + 路径隔离）
	•	大文件：不要让 serverless 同步生成很久

⸻

10) Observability（错误、性能、审计、产品分析）

用什么技术
	•	Sentry：前端 + 后端（Next.js）错误、性能、trace
	•	日志：结构化日志（pino）+ Log drain（到 Axiom/Datadog 等）
	•	产品分析：PostHog（事件埋点 + session replay）

你会踩的坑
	•	“能复现问题”比“能看到报错”重要：要把 user_id、request_id 串起来
	•	隐私与日志脱敏：宝宝数据属于敏感数据，默认不进日志/埋点 payload

⸻

11) 安全与风控（成熟 SaaS 的底线）

用什么技术
	•	Rate limit：Upstash Redis rate limiter（按 IP + user）
	•	防刷：登录/写入接口加限制，webhook 严格验签
	•	DB：RLS 思维（即使你不用 Supabase 也要在 API 层 enforce：WHERE user_id = …）

你会踩的坑
	•	越权是最常见事故：每个查询都要带 user_id 条件
	•	滥用与成本：没有 rate limit 很快被打爆（尤其免费档）

⸻

12) 版本化与发布（团队化工程习惯）

用什么技术
	•	环境：Preview/Production 两套 Neon 数据库 + 两套 Clerk/Stripe 配置
	•	DB migrations：CI 里跑（谨慎），或用手动 gate（更安全）
	•	Feature flags：简单版用 DB settings/env；成熟版用 LaunchDarkly（可选）

你会踩的坑
	•	配置漂移：env 太多必乱，必须“配置清单化”
	•	迁移回滚：线上出问题你怎么撤（至少要有 backward-compatible 方案）

⸻

你这个 BabyLog，最值得“刻意踩坑”的 6 个点（最像真实 SaaS）
	1.	Stripe Webhook + 幂等落库（必做）
	2.	Background jobs + cron + 预聚合统计
	3.	严格的权限与越权防护（user_id enforcement）
	4.	缓存策略（dashboard 快但不脏）
	5.	Observability（Sentry + request_id 链路）
	6.	环境隔离（preview/prod 全套）

如果你愿意，我可以直接按你已有模块（landing / auth / dashboard tabs / quick log / undo / pricing / reviews form）给你画一张“页面→API→DB→异步任务→监控”的工程落地清单（偏 checklist 风格），让你按顺序实现时每一步都能踩到该踩的坑。
