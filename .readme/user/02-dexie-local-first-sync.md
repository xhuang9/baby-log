# Dexie.js 使用说明（面向 Local-First Sync 计划）

**目的**：为“完全 local-first sync”方案提供 Dexie.js 能力概览与本项目的落地用法，便于制定同步策略与实施路线。

---

## Dexie.js 能力（与本项目直接相关）

- **版本化 Schema**：用 `this.version(n).stores(...)` 管理表结构与索引变更，便于离线数据演进。
- **类型安全的表定义**：用 `EntityTable<T, PK>` 绑定表与主键，保证本地数据结构与服务端一致。
- **高效批量写入**：`bulkPut` 适合初始同步与增量同步写入。
- **事务支持**：`transaction('rw', [...tables], fn)` 用于跨表原子清理或批量更新。
- **响应式查询**：`dexie-react-hooks` 的 `useLiveQuery` 让 UI 直接跟随 IndexedDB 变化。
- **索引/复合索引**：用索引优化常见查询（如按 `babyId`、时间排序），保证读性能。

Dexie 负责**持久化与即时读取**，并不负责网络同步；同步仍需你自己设计 outbox、拉取策略和冲突处理。

---

## 本项目中的 Dexie 用法（现状）

### 1) Schema 与表结构
集中在 `src/lib/local-db.ts`，并保持与服务端 schema 镜像一致：

- **核心数据**：`feedLogs`、`babies`、`babyAccess`
- **用户/UI**：`users`、`uiConfig`
- **同步元数据**：`syncMeta`、`syncStatus`、`outbox`

> 本项目采用“本地为即时读模型、服务端为真值源”的策略。

### 2) UI 读取路径
UI 通过 `useLiveQuery` 读取 IndexedDB：

- `src/hooks/useFeedLogs.ts` 中的 `useFeedLogsForBaby` / `useLatestFeedLog` 等
- **好处**：本地数据写入后，UI 自动刷新，无需等待网络返回

### 3) 初始同步写入
`src/services/initial-sync.ts` 执行：

- `fetch /api/sync/initial` 拉取关键数据
- `bulkPut` 写入 Dexie
- `updateSyncStatus` 记录同步状态

### 4) 背景增量同步
`src/workers/sync-worker.ts` 负责拉取分段数据；主线程 `src/services/sync-worker-manager.ts` 负责写入 Dexie：

- Worker 仅负责网络拉取与消息传递
- Dexie 写入保持在主线程（避免多上下文写冲突）

### 5) Outbox 与离线写入
`src/lib/local-db.ts` 的 `outbox` 表存储离线突变：

- `addToOutbox`：写入待同步变更
- `getPendingOutboxEntries`：取出待同步任务
- `updateOutboxStatus`：写入同步结果

---

## 建议的 Local-First Sync 计划（基于 Dexie）

1) **启动/登录时 Hydration**
   - 先读 Dexie → 立刻渲染
   - 若无本地用户，则触发初始同步

2) **初始同步（Blocking）**
   - 拉取 user/babies/access + 最近日志
   - `bulkPut` 写入 Dexie
   - 更新 `syncStatus`（用于 UI 状态展示）

3) **后台增量同步（Non-blocking）**
   - Worker 分页拉取历史日志
   - 主线程写入 Dexie
   - 记录 `syncMeta.cursor` / `syncStatus.progress`

4) **离线写入（Outbox）**
   - 先写 Dexie，再写 outbox
   - 网络恢复后重放 outbox
   - 成功后更新本地记录（LWW 以服务端为准）

5) **冲突处理**
   - 按本项目策略：**LWW（服务端时间戳胜出）**
   - 同步返回后覆盖本地 Dexie 记录

6) **退出登录清理**
   - `clearAllLocalData()` 清空 IndexedDB，避免跨账号污染

---

## 注意事项 / Gotchas

- **日期字段必须转换**：服务端字符串 ⇄ Dexie `Date` 对象
- **ID 策略需统一**：新建对象用客户端 UUID，便于幂等重放
- **升级版本要完整声明**：每次 `version(n)` 需要包含所有表定义
- **Dexie 不负责同步**：同步机制必须外层实现（outbox + 拉取）

---

## 相关文件

- `src/lib/local-db.ts`
- `src/hooks/useFeedLogs.ts`
- `src/services/initial-sync.ts`
- `src/services/sync-worker-manager.ts`
- `src/workers/sync-worker.ts`
- `.readme/sections/local-first.index.md`
