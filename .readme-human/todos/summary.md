# 当前结论与待办（基于 .readme-human/manual）

## 技术栈定位（保持）
- Next.js 16 App Router + TypeScript + Tailwind/shadcn 作为主框架。
- Clerk 负责登录与会话；Drizzle + Neon Postgres 作为核心数据层。

## 该保留 / 该暂缓 / 该加入
**保留**
- i18n（next-intl）先保留但只做 `en`，避免多语言复杂度。
- Drizzle migrations、严格 TS 配置，防止早期数据模型返工。

**暂缓（去掉或停用）**
- Storybook/Chromatic、Checkly、Crowdin 自动化：对 MVP 无增量价值。
- PostHog 全量埋点：先用最少事件（登录、写入、查看 summary）。
- 复杂监控/安全（Arcjet 规则、复杂 WAF）先不上。

**建议加入**
- 最小支付：Stripe Checkout + Webhook（一次性付款，后付费触发）。
- 最小幂等：webhook_events 表防重复。
- 简易 rate limit（Upstash Redis 可选），只对写入 API。

## 现在该做的（分步骤）
1) **MVP 闭环**
- Clerk 登录后直达 `/app`。
- 最小数据模型：`users`(clerk_user_id), `babies`(默认 1 条), `logs`(append-only)。
- 快捷记录 + 撤销窗口（5–10 秒）。
- 今日摘要（非分析型，安抚型文案）。

2) **最小产品化**
- `/app/history` 按天列表与筛选。
- `/app/settings` 只放最必要偏好（单位、默认按钮集合）。
- 数据导出 CSV。

3) **支付与稳定性**
- Stripe webhook 幂等落库。
- 预发布/生产环境分离（Vercel Preview + Neon 分支）。

## 最终项目形态（合理终点）
- 用户零设置进入可用 Dashboard，固定快捷按钮形成肌肉记忆。
- 记录为事件流，读取为聚合视图（今日摘要、历史列表）。
- 付费触发点：首次“有价值的今日总结”后提示一次性付费。
- 监控、分析、自动化工具在有真实留存后逐步补齐。
