# 部署运行、演示手册与评审证据包

**版本号**: v1.0  
**日期**: 2026-05-28  
**对应 Issue**: ISSUE-009  
**用途**: 竞赛演示和评审材料准备

---

## 一、文档目标

本文档说明版本火车需求管理系统的本地运行方式、测试账号、推荐演示路线、截图/录屏清单和评审证据索引。它是竞赛提交和现场讲解时的操作手册。

## 二、运行前置条件

| 依赖 | 要求 | 当前检查情况 |
|------|------|--------------|
| Node.js | >= 18 | 当前 PowerShell 可用 `v24.15.0` |
| pnpm | >= 8 | 当前 PATH 未直接识别 `pnpm`；`corepack pnpm` 可用但版本为 11.4.0 |
| Docker | 用于 PostgreSQL 等基础设施 | 当前 PATH 未识别 `docker` |
| PostgreSQL | 后端 Prisma 数据库 | 可通过 `docker-compose.yml` 或本地数据库提供 |
| 网络 | Coze API 调用需要网络和密钥 | 需要配置环境变量 |

环境风险：当前会话中 `corepack pnpm` 会尝试使用 pnpm 11.4.0，并认为现有 `node_modules/.pnpm/lock.yaml` 不兼容。正式演示前应固定 pnpm 版本或重新安装依赖。

## 三、环境变量

参考 `release-train/.env.example` 配置。关键变量包括：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `JWT_SECRET` | JWT 签名密钥 |
| `JWT_EXPIRES_IN` | Token 有效期 |
| `CORS_ORIGINS` | 前端允许域名 |
| `COZE_API_KEY` | Coze API Key |
| `COZE_WORKFLOW_ID` | Coze 工作流 ID |
| `LOG_DIR` | 后端日志目录 |

敏感变量不得提交到 Git，应放在本地 `.env` 或 `.env.local`。

## 四、启动步骤

### 4.1 安装依赖

```bash
cd release-train
pnpm install
```

如本机未安装 pnpm，可先通过 corepack 启用，但应注意与现有 lockfile 和 `node_modules` 的兼容性。

### 4.2 启动数据库

```bash
cd release-train
docker compose up -d
```

如果 Docker 不可用，可使用本机 PostgreSQL，并确保 `DATABASE_URL` 指向正确数据库。

### 4.3 初始化数据库

```bash
cd release-train
pnpm db:generate
pnpm db:push
pnpm --filter server db:seed
```

### 4.4 启动后端

```bash
cd release-train
pnpm dev:server
```

后端默认地址：

```text
http://localhost:3000
```

Swagger：

```text
http://localhost:3000/documentation
```

健康检查：

```text
GET http://localhost:3000/api/health
```

### 4.5 启动前端

```bash
cd release-train
pnpm dev:web
```

前端默认地址：

```text
http://localhost:5173
```

## 五、测试账号

所有种子账号默认密码：

```text
123456
```

推荐演示账号：

| 场景 | 账号 | 角色 |
|------|------|------|
| 业务录入和发起评审 | `puhuiqianduan_ba` | BA |
| 需求评审 | `puhuiqianduan_project_mgr` | PROJECT_MGR |
| 开发状态推进 | `puhuiqianduan_tech_mgr` | TECH_MGR |
| SIT通过 | `puhuiqianduan_test_mgr` | TEST_MGR |
| 火车、班次和纳版管理 | `puhuiqianduan_train_admin` | TRAIN_ADMIN |

完整账号见 `release-train/测试账号文档.md`。

## 六、推荐演示路线

### 6.1 AI原生研发过程讲解

展示材料：

1. `AGENTS.md`：AI 协作规则。
2. `CONTEXT.md`：领域语言。
3. `handoff-*.md`：上下文交接。
4. `issues/project-docs/`：文档工作 issue 化。
5. `docs/project-engineering/`：项目级工程文档包。

讲解重点：本项目不只是使用 AI 写代码，而是把 AI 纳入需求、设计、实现、测试和交付流程。

### 6.2 需求池全流程

1. 使用 BA 登录。
2. 进入 `/requirements`。
3. 新建需求并保存草稿。
4. 发起评审。
5. 切换项目经理账号。
6. 评审通过，需求进入已就绪。
7. 查看需求详情和状态日志。

### 6.3 版本火车与班次管理

1. 使用火车管理员登录。
2. 进入 `/trains` 创建或查看版本火车。
3. 创建班次，查看关键节点。
4. 查看班次容量快照。
5. 进入班次详情查看待纳版和已纳版需求。

### 6.4 AI智能纳版

1. 在班次详情选择多个已就绪需求。
2. 点击 AI 智能纳版。
3. 展示容量分析、建议列表、依赖风险和 AI 总结。
4. 只确认 recommended 需求。
5. 执行纳版，查看需求状态变为已纳版。

### 6.5 状态推进与投产

1. 技术经理推进开发完成。
2. 测试经理推进 SIT 通过。
3. BA 推进 UAT 通过。
4. 火车管理员执行封板或投产。
5. 查看班次状态对需求状态的联动。

### 6.6 统一仪表盘

1. 访问 `/dashboard`。
2. 展示需求状态统计。
3. 点击统计卡片跳转需求列表。
4. 展示待办事项。
5. 展示关键时间倒计时和班次进度。

## 七、截图与录屏清单

| 编号 | 内容 | 用途 |
|------|------|------|
| S01 | 登录页和角色账号 | 演示内置用户和权限 |
| S02 | 需求列表和筛选 | 需求池能力 |
| S03 | 需求详情和状态日志 | 审计能力 |
| S04 | 火车列表和火车详情 | 版本火车容器 |
| S05 | 班次详情和容量快照 | 多班次架构 |
| S06 | AI智能纳版建议弹窗 | AI能力亮点 |
| S07 | 容量超限/依赖风险提示 | 可解释性 |
| S08 | 统一仪表盘 | Task4成果 |
| S09 | Swagger API 文档 | 工程完整性 |
| S10 | 代码结构和工程文档包 | AI原生研发过程证据 |

## 八、评审证据索引

| 评分关注点 | 证据 |
|------------|------|
| 业务需求说明 | `RT-业务需求说明书与MVP范围基线_v1.0_20260528.md` |
| 方案设计 | `RT-领域模型术语体系与状态机_v1.0_20260528.md`、`RT-系统总体架构与技术实现地图_v1.0_20260528.md` |
| 代码开发 | `release-train/apps/server`、`release-train/apps/web`、`release-train/packages/shared` |
| 测试验证 | `release-train/apps/server/src/__tests__`、`release-train/apps/web/src/__tests__`、Task3测试案例 |
| AI能力 | `RT-AI智能纳版能力设计与可解释性_v1.0_20260528.md`、`modules/smart-onboard` |
| 安全研发 | `RT-安全研发质量保障与非功能需求_v1.0_20260528.md`、`规则文档/RT-安全规范_20260510.md` |
| 非功能需求 | 性能、安全、可维护性、可观测性章节 |
| AI原生过程 | `RT-AI原生研发过程与协作规范_v1.0_20260528.md`、`AGENTS.md`、`handoff-*.md` |

## 九、正式演示前检查清单

- [ ] pnpm 版本固定并能正常执行 `pnpm install`。
- [ ] Docker 或 PostgreSQL 数据库可用。
- [ ] `.env` 已配置 `DATABASE_URL` 和 `JWT_SECRET`。
- [ ] 如演示智能纳版真实 AI，已配置 Coze 变量。
- [ ] 已执行 Prisma generate、db push 和 seed。
- [ ] 后端 `/api/health` 返回正常。
- [ ] 前端能访问 `/login`。
- [ ] 推荐账号能正常登录。
- [ ] 需求池、班次、智能纳版、仪表盘演示数据已准备。
- [ ] 截图和录屏路径已确认。

## 十、版本记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-05-28 | 初始版本，整理部署运行、演示路线和评审证据包 |
