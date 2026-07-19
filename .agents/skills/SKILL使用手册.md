# 测试技能使用手册

> 版本：v1.0  
> 日期：2026-07-14  
> 适用范围：版本火车需求管理系统 MVP

---

## 目录

1. [前置准备：飞书配置](#1-前置准备飞书配置)
2. [Step 1：test-strategy-planner 测试策略规划](#step-1-test-strategy-planner-测试策略规划)
3. [Step 2：unit-test-governance 单测治理](#step-2-unit-test-governance-单测治理)
4. [Step 3：automating-api-testing API测试自动化](#step-3-automating-api-testing-api测试自动化)
5. [Step 4：webapp-testing Web应用测试](#step-4-webapp-testing-web应用测试)
6. [Step 5：test-report-generator 自测报告生成](#step-5-test-report-generator-自测报告生成)

---

## 1. 前置准备：飞书配置

### 1.1 飞书应用创建与配置

在飞书开发者后台创建自建应用：

1. **创建应用**：飞书开放平台 → 企业自建应用 → 创建应用
2. **重定向 URL**：`http://localhost:3000/callback`
3. **开通权限**：一次性开通以下 scope：

| 权限分类 | Scope | 说明 |
|----------|-------|------|
| Docx 读写 | `docs:doc:readonly`、`docs:document.content:read`、`docx:document:readonly` | 搜索和读取飞书文档 |
| Wiki 读写 | `wiki:wiki:readonly`、`wiki:node:read`、`wiki:node:retrieve`、`wiki:space:read`、`wiki:space:retrieve` | 搜索和读取知识库 |
| 文档创建 | `docs:document:import` | 将 Markdown 报告导入为飞书文档 |
| 权限管理 | `docs:permission.member:create`、`docs:permission.member:retrieve` | 添加协作者 |
| 用户查询 | `contact:user:search`、`contact:user.id:readonly`、`contact:user.basic_profile:readonly` | 查询审批人 |
| 任务管理 | `task:task:write`、`task:task:read` | 创建普通任务 |
| 审批管理 | `approval:instance`、`approval:approval:readonly`、`approval:task` | 创建审批实例（tenant scope，需管理员批准） |
| 令牌刷新 | `offline_access` | 允许 OAuth 刷新令牌 |

### 1.2 TRAE Work MCP 配置

#### Windows 环境

配置文件路径：`C:\Users\<用户名>\AppData\Roaming\TRAE SOLO CN\User\mcp.json`

#### macOS 环境

配置文件路径：`~/Library/Application Support/TRAE SOLO CN/User/mcp.json`

在 TRAE Work 中 **设置 > MCP > 手动添加**，填入以下 JSON：

```json
{
  "mcpServers": {
    "lark-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@larksuiteoapi/lark-mcp",
        "mcp",
        "-a",
        "<your_app_id>",
        "-s",
        "<your_app_secret>",
        "--oauth",
        "--token-mode",
        "user_access_token",
        "--tool-name-case",
        "snake",
        "--language",
        "zh"
      ]
    }
  }
}
```

### 1.3 OAuth 授权

#### Windows 环境

在 PowerShell 中运行（60秒内完成浏览器授权）：

```powershell
npx -y @larksuiteoapi/lark-mcp login -a "<your_app_id>" -s "<your_app_secret>"
```

#### macOS 环境

在终端中运行（60秒内完成浏览器授权）：

```bash
npx -y @larksuiteoapi/lark-mcp login -a "<your_app_id>" -s "<your_app_secret>"
```

授权成功后**重启 TRAE Work**。

### 1.4 验证

重启后执行只读的 Docx/Wiki 搜索或用户搜索，成功返回结果即表示配置完成。

---

## Step 1：test-strategy-planner 测试策略规划

### 2.1 用途

以已确认的测试案例为主线，结合逻辑代码和共享自测检查点，产出分层测试策略、补充案例建议和覆盖分析报告。

### 2.2 触发方式

```
Use Skill: test-strategy-planner
```

或提供测试案例文件路径：

```
"reports/test-strategy/ST-T2-US2.3-测试策略_v1.0_20260630.md#L3-15" 用 Use Skill: test-strategy-planner 分析
```

### 2.3 执行流程

```
配置读取 → 模块A(范围确认) → 模块B(案例分层) → 模块C(检查点审查) → 模块D(资产分析) → 模块E(报告生成) → 模块F(飞书发布)
```

#### 模块 A：读取与范围确认

- 输出分析前输入确认清单（测试案例来源、需求/设计来源、代码范围、存量报告处理方式）
- 用户确认后进入正式分析

#### 模块 B：测试案例分层策略

- 为每个测试案例推荐测试层级（L1/L2/L3/M）
- 识别可能需要人工验证的 UI 场景，询问用户是否纳入
- 写入策略字段：推荐测试层级、分层理由

#### 模块 C：自测检查点白盒审查与案例补充

- 完整遍历 68 个共享检查点叶子项
- 用逻辑代码判定"涉及/不涉及/待确认"
- 生成补充案例建议（建议-CP-001~009）
- 询问用户是否回写正式测试案例文档

#### 模块 D：测试资产覆盖分析

- 查找已有单测、API 测试、UI 测试资产
- 识别资产实际层级和断言
- 映射既有案例与涉及检查点
- 记录覆盖结论和缺口

#### 模块 E：报告生成与输出自检

- 生成主报告和案例对照表附件
- 执行输出结构自检（文件存在、章节完整、关键表头存在）

#### 模块 F：最终对话、飞书发布与确认任务

- 询问是否创建飞书文档和"自测策略确认"审批任务
- 用户提供审批人信息后，通过飞书 MCP 查询并确认
- 创建任务并验证状态

### 2.4 输出产物

| 产物 | 路径 |
|------|------|
| 测试策略报告 | `reports/test-strategy/ST-{scope}-测试策略_v{version}_{date}.md` |
| 测试案例对照表 | `reports/test-strategy/ST-{scope}-测试案例对照表_v{version}_{date}.md` |
| 人工验证证据目录 | `evidence/{scope}/summary.md` |

---

## Step 2：unit-test-governance 单测治理

### 3.1 用途

作为前端和后端代码变更的统一单测门禁，检查增量覆盖率（>80%）和单测通过率（100%）。

### 3.2 触发方式

```
Use Skill: unit-test-governance
```

或提供测试策略报告路径：

```
"reports/test-strategy/ST-T2-US2.3-测试策略_v1.1_20260713.md" 用 Use Skill: unit-test-governance 执行单测门禁检查
```

### 3.3 执行流程

```
输入确认 → 识别变更代码 → 搜索已有单测 → 检查L1策略案例覆盖 → 运行单测 → 计算覆盖率 → 生成分析版报告 → 自动补齐(可选) → 更新最终版报告
```

### 3.4 输入确认

必须确认：
- 代码范围（分支、commit range、文件列表或测试策略报告）
- 测试文件列表
- L1 策略案例（从测试策略报告提取）
- 自动补齐开关

### 3.5 硬性门禁

```
后端增量单测覆盖率 > 80%
后端单测通过率 = 100%
```

前端不默认要求单测覆盖率门禁，只在以下情况补前端单测：
- 表单校验、字段格式化
- 权限显隐、按钮状态
- 分页、排序、筛选
- React hook、Vue composable
- 工具函数、状态管理

### 3.6 自动补齐（可选）

用户确认后，自动生成候选单测并写入测试文件：
- 状态流转、权限判断、参数校验
- 计算、转换、映射、排序、分页
- 幂等、重试、降级、缓存

### 3.7 报告结构（强制）

1. 单测门禁摘要
2. 已有测试证据
3. L1 策略案例覆盖检查
4. 变更逻辑覆盖分类
5. 自测检查点 L1 覆盖现状
6. 需补充单测清单
7. 未覆盖或排除风险
8. 单测执行证据
9. 最终决策

### 3.8 输出产物

| 产物 | 路径 |
|------|------|
| 单测治理报告 | `reports/unit-test-governance/ST-{scope}-单测治理_v{version}_{date}.md` |

---

## Step 3：automating-api-testing API测试自动化

### 4.1 用途

自动化测试 REST 和 GraphQL API，包括请求生成、响应验证、schema 合规性检查、认证流程和错误处理。

### 4.2 触发方式

```
Use Skill: automating-api-testing
```

或：

```
"test the API", "generate API tests", "validate API contracts"
```

### 4.3 前置条件

- API 测试库已安装（Supertest、REST-assured、httpx 或 Postman/Newman）
- API 规范文件（OpenAPI/Swagger YAML/JSON 或 GraphQL SDL）
- 测试环境中运行的目标 API
- 认证凭据或 API Key

### 4.4 执行流程

```
解析API规范 → 生成测试用例 → 验证响应结构 → 测试CRUD生命周期 → 测试错误处理 → 生成覆盖报告
```

### 4.5 测试用例生成

每个端点生成以下测试：

| 测试类型 | 说明 |
|----------|------|
| 成功案例 | 发送符合 schema 的有效请求，断言 200/201 响应 |
| 验证错误 | 发送缺少必填字段、错误类型、超出范围的值，断言 400 响应 |
| 认证测试 | 测试有效、过期、缺失凭据，断言 200、401、403 |
| 资源不存在 | 请求不存在的资源，断言 404 响应 |
| 幂等性 | 重复发送 PUT/DELETE 请求，验证行为一致 |

### 4.6 响应验证

- Content-Type 匹配预期
- 响应体符合 OpenAPI schema
- 响应头检查（Cache-Control、Rate-Limit、CORS）
- 分页元数据验证

### 4.7 输出产物

| 产物 | 路径 |
|------|------|
| API 测试文件 | `tests/api/` 目录下按资源组织 |
| Postman 集合 | `.trae/skills/automating-api-testing/output/*.postman_collection.json` |
| JMeter 脚本 | `.trae/skills/automating-api-testing/output/*.jmx` |
| 测试覆盖报告 | `.trae/skills/automating-api-testing/output/test-coverage-report.md` |

### 4.8 示例代码

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('GET /api/schedules', () => {
  it('returns a paginated schedule list', async () => {
    const res = await request(app)
      .get('/api/schedules?page=1&pageSize=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body.list).toBeInstanceOf(Array);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('returns 401 without authentication', async () => {
    await request(app).get('/api/schedules').expect(401);
  });
});
```

---

## Step 4：webapp-testing Web应用测试

### 5.1 用途

使用 Playwright 测试本地 Web 应用，支持验证前端功能、调试 UI 行为、捕获截图、查看浏览器日志。

### 5.2 触发方式

```
Use Skill: webapp-testing
```

### 5.3 决策树

```
用户任务 → 是静态HTML?
    ├─ 是 → 直接读取HTML文件识别选择器 → 编写Playwright脚本
    │
    └─ 否(动态Web应用) → 服务器已运行?
        ├─ 否 → 使用 with_server.py 启动服务器 → 编写Playwright脚本
        │
        └─ 是 → 侦察-行动模式:
            1. 导航并等待 networkidle
            2. 截图或检查DOM
            3. 从渲染状态识别选择器
            4. 使用发现的选择器执行操作
```

### 5.4 启动服务器

使用 `with_server.py` 管理服务器生命周期：

**单服务器：**
```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_automation.py
```

**多服务器（后端 + 前端）：**
```bash
python scripts/with_server.py \
  --server "cd release-train/apps/server && pnpm dev" --port 3000 \
  --server "cd release-train/apps/web && pnpm dev" --port 5173 \
  -- python your_automation.py
```

### 5.5 Playwright 脚本模板

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')  # 关键：等待JS执行完成
    
    # 执行自动化逻辑
    page.locator('text=班次列表').click()
    page.locator('select[name="train"]').select_option('火车A')
    page.screenshot(path='/tmp/schedule_list.png', full_page=True)
    
    browser.close()
```

### 5.6 最佳实践

- 使用 `sync_playwright()` 同步模式
- 动态应用必须先等待 `networkidle` 再检查 DOM
- 使用描述性选择器：`text=`、`role=`、CSS 选择器或 ID
- 完成后关闭浏览器
- 使用 `page.wait_for_selector()` 或 `page.wait_for_timeout()` 添加适当等待

### 5.7 示例脚本

**元素发现：**
```python
# examples/element_discovery.py - 发现页面上的按钮、链接和输入框
```

**静态 HTML 自动化：**
```python
# examples/static_html_automation.py - 使用 file:// URL 测试本地 HTML
```

**控制台日志捕获：**
```python
# examples/console_logging.py - 自动化过程中捕获控制台日志
```

---

## Step 5：test-report-generator 自测报告生成

### 6.1 用途

聚合 L1 单测门禁结论、L2 API、L3 UI 和 M 人工验证的真实执行证据，生成自测报告并给出通过、部分覆盖或阻塞结论。

### 6.2 触发方式

```
Use Skill: test-report-generator
```

或：

```
"生成自测报告", "输出测试报告", "证明自测通过", "测试证据报告"
```

### 6.3 输入确认

正式生成报告前必须确认：

| 输入类型 | 来源 |
|----------|------|
| 测试策略报告 | `reports/test-strategy/ST-{scope}-测试策略_v{version}_{date}.md` |
| 单测治理报告 | `reports/unit-test-governance/ST-{scope}-单测治理_v{version}_{date}.md`（必须为最终版） |
| 策略对照表附件 | `reports/test-strategy/ST-{scope}-测试案例对照表_v{version}_{date}.md` |
| L2 API 测试文件 | `**/*.api.test.ts`、`**/api/**/*.test.ts` |
| L3 UI 测试文件 | `playwright-report/index.html`、`test-results/**/*.png` |
| M 人工证据目录 | `evidence/{scope}/**/summary.md` |

### 6.4 执行流程

```
输入确认 → 收集测试数据 → 分析执行结果 → 生成报告 → 输出自检 → 飞书发布(可选)
```

### 6.5 数据收集

**L1 单元测试：**
- 从最终版单测治理报告提取：通过率、覆盖率、门禁结论、需补充清单

**L2 API 测试：**
- 检索最新 API 测试文件，分析执行结果和覆盖状态

**L3 UI 测试：**
- 检索 Playwright 测试文件和报告，分析执行结果和截图证据

**M 人工验证：**
- 读取 `evidence/{scope}/summary.md` 和截图

### 6.6 报告结构

```markdown
# ST-{scope}-自测报告_v{version}_{date}.md

## 基本信息
- 报告编号、生成时间、执行环境、Git 分支/Commit

## 测试策略概览
- L1/L2/L3/M 层级说明、覆盖率目标

## L1 单元测试门禁结论
- 通过率、覆盖率、最终决策、需补充清单

## L2 接口自动化覆盖分析
- API 路径、测试文件、测试状态、覆盖逻辑

## L3 UI 自动化覆盖分析
- 用户旅程、测试文件、测试状态、截图证据

## M 人工验证证据汇总
- 验证项、证据文件、验证结果

## 测试结果明细
- 测试案例编号、测试方式、执行结果、覆盖状态

## 自测检查点覆盖摘要
- 检查点、层级、优先级、覆盖状态、证据来源

## 执行概要
- 各层级测试数和状态

## 结论
- L1/L2/L3/M 状态、整体交付建议
```

### 6.7 输出自检

报告写入后必须检查：
1. 文件存在、非空、UTF-8 编码
2. 文件名包含 `ST-`、版本号和日期
3. 必需章节和关键表头存在
4. L2/L3/M 的"通过/已完成"必须有真实执行结果或人工明确结论

### 6.8 飞书发布

报告完成自检后，可询问用户是否：
- 创建飞书文档
- 创建"自测完成确认"审批任务
- 指定审批人

### 6.9 输出产物

| 产物 | 路径 |
|------|------|
| 自测报告 | `reports/test-report/ST-{scope}-自测报告_v{version}_{date}.md` |

---

## 完整测试流程总结

```
┌─────────────────────────────────────────────────────────────────┐
│                        测试流程                                  │
├─────────────────────────────────────────────────────────────────┤
│  Step 1                                                         │
│  test-strategy-planner                                          │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ 输入确认 → 案例分层 → 检查点审查 → 资产分析 → 报告生成 │       │
│  └─────────────────────────────────────────────────────┘       │
│         ↓                                                       │
│  Step 2                                                         │
│  unit-test-governance                                           │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ 输入确认 → 识别变更 → 运行单测 → 计算覆盖率 → 报告    │       │
│  └─────────────────────────────────────────────────────┘       │
│         ↓                                                       │
│  Step 3                                                         │
│  automating-api-testing                                         │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ 解析规范 → 生成用例 → 验证响应 → 测试CRUD → 报告      │       │
│  └─────────────────────────────────────────────────────┘       │
│         ↓                                                       │
│  Step 4                                                         │
│  webapp-testing                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ 启动服务器 → 侦察DOM → 识别选择器 → 执行自动化 → 截图 │       │
│  └─────────────────────────────────────────────────────┘       │
│         ↓                                                       │
│  Step 5                                                         │
│  test-report-generator                                          │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ 输入确认 → 收集证据 → 分析结果 → 生成报告 → 飞书发布   │       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 常见问题

| 问题 | 原因 | 解决方法 |
|------|------|----------|
| `userToken must be provided` | 未完成 OAuth 授权或 token 过期 | 重新运行 login 命令授权 |
| API 测试连接拒绝 | 服务器未启动或 URL 错误 | 检查服务器状态和 `BASE_URL` 配置 |
| Playwright 找不到元素 | 动态页面未等待 `networkidle` | 添加 `page.wait_for_load_state('networkidle')` |
| 单测门禁阻塞 | 缺少覆盖率数据 | 运行测试生成覆盖率报告 |
| 飞书文档创建失败 | MCP 权限不足 | 确认飞书应用已开通 `docs:document:import` 权限 |

---

*文档编号：RT-SKILL-MANUAL*  
*版本：v1.0*