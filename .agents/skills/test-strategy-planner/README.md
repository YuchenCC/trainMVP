# test-strategy-planner 使用说明

本 skill 以已确认的测试案例为主线，结合逻辑代码和共享自测检查点，产出分层测试策略、补充案例建议和覆盖分析报告。

## 用途与边界

| 负责 | 不负责 |
|---|---|
| 确认来源和分析范围 | 运行单测、接口测试、E2E 或人工验证 |
| 制定 L1/L2/L3/M 分层策略 | 用 L2/L3/M 抵扣后端 L1 门禁 |
| 白盒审查共享检查点并建议补充案例 | 将补充案例伪装成用户原始测试案例 |
| 分析已有测试资产的实际层级和覆盖结果 | 替代 `unit-test-governance` 或 `test-report-generator` |
| 生成策略主报告与逐案例附件 | 在报告中写入后续 skill 建议 |

默认优先级：单元测试优先，其次 API 自动化，最后 UI 自动化或 SIT 人工验证。

## 执行流程

按以下顺序执行，不能跳过任何模块：

```
0. 配置读取 → A → B → C → D → E → F
```

### 模块说明

| 模块 | 名称 | 说明 |
|---|---|---|
| 0 | 配置读取 | 读取 `config/project-config.yaml` 获取路径、模式和报告命名规则 |
| A | 读取与范围确认 | 输出分析前输入确认清单，等待用户确认；测试案例是必需输入 |
| B | 测试案例分层策略 | 为每个测试案例推荐 L1/L2/L3/M 层级，识别可能需要人工验证的 UI 场景 |
| C | 自测检查点白盒审查与案例补充 | 遍历 68 个共享检查点，用逻辑代码判定涉及性，生成补充案例建议 |
| D | 测试资产覆盖分析 | 查找已有测试资产，识别实际层级和断言，映射覆盖结论 |
| E | 报告生成与输出自检 | 生成主报告和附件，执行输出结构自检 |
| F | 最终对话、飞书发布与确认任务 | 询问是否创建飞书文档和审批任务 |

## 使用方式

### 触发命令

```
Use Skill: test-strategy-planner
```

或提供测试案例文件路径：

```
"reports/test-strategy/ST-T2-US2.3-测试策略_v1.0_20260630.md#L3-15" 用 Use Skill: test-strategy-planner 分析
```

### 输入确认（模块 A）

正式分析前必须确认：
- 测试案例来源（本地文件或飞书文档）
- 需求/设计来源
- 逻辑代码范围
- 测试代码范围
- 提交范围（如适用）
- 存量报告是否复用

### 飞书集成

如需从飞书读取测试案例或发布报告，需提前配置飞书 MCP：

1. 在飞书开发者后台创建自建应用
2. 配置重定向 URL：`http://localhost:3000/callback`
3. 开通权限：`docs:doc:readonly`、`docs:document:import`、`approval:instance` 等
4. 在 TRAE Work 中配置 MCP 服务器

详细配置请参考：`../SKILL使用手册.md`

## 输出产物

| 产物 | 路径 |
|---|---|
| 测试策略报告 | `reports/test-strategy/ST-{scope}-测试策略_v{version}_{date}.md` |
| 测试案例对照表 | `reports/test-strategy/ST-{scope}-测试案例对照表_v{version}_{date}.md` |
| 人工验证证据目录 | `evidence/{scope}/summary.md` |

## 人工验证指南

### 证据目录结构

默认走轻量模式，只生成一个总的结论文件：

```text
evidence/{scope}/
  summary.md
  screenshots/
  logs/
  db/
  api/
```

所有人工验证案例都写在 `summary.md` 的"验证结论"表里。截图、日志、数据库结果、接口结果只作为附件放到对应目录。

只有正式验收、审计、或明确要求"按案例拆分"时，才按每个案例创建独立目录。

### 人工需要做哪些事

1. 在 SIT 环境执行页面验证。
2. 把关键截图放到 `screenshots/`。
3. 如果是失败、异常、写操作或后端链路问题，把日志放到 `logs/`。
4. 如果涉及数据变化，把 SQL 和结果放到 `db/`。
5. 如果需要接口证据，把 HAR、curl、JMeter 或接口响应摘要放到 `api/`。
6. 在 `summary.md` 里填写每个案例的结论、证据路径和备注。

### 日志查询建议

取日志前先确定一个关联键，优先级如下：

1. `traceId` / `requestId` / `correlationId`
2. 当前登录 `userId`
3. 业务主键，如 `requirementId`、`trainId`、`scheduleId`
4. 精确时间窗口，例如 `2026-06-28 14:00:00` 到 `14:10:00`

建议把关联键写进 `summary.md` 的"关联 ID"字段。

#### 按 traceId/requestId 查日志

```bash
grep "TRACE_ID" app.log > evidence/{scope}/logs/trace-TRACE_ID.log
```

#### 按用户和时间窗口查日志

```bash
awk '/2026-06-28 14:00/,/2026-06-28 14:10/' app.log | grep "userId" > evidence/{scope}/logs/user-time-window.log
```

#### 用日志平台查

如果使用 ELK、Loki、云日志平台或 APM，建议保存这些证据：

| 证据 | 建议 |
|---|---|
| 查询条件 | 截图或复制查询语句 |
| 查询结果 | 导出 CSV 或截图 |
| 关键字段 | traceId、接口路径、状态码、异常栈、用户 ID、业务 ID |
| 对应关系 | 在 `summary.md` 里写明对应哪个案例 |

### 数据库变化建议

涉及新增、修改、删除、状态流转时，保留操作前后查询结果。

```sql
-- 操作前
select id, status, updated_at from train_schedules where id = :scheduleId;

-- 操作后
select id, status, updated_at from train_schedules where id = :scheduleId;
```

只读查询即可，不建议人工验证时直接改数据库。

## 与其他技能的协作关系

```
test-strategy-planner (制定策略)
       ↓
unit-test-governance (单测门禁)
       ↓
automating-api-testing (L2 API测试)
webapp-testing (L3 UI测试)
       ↓
test-report-generator (汇总报告)
```

完整流程说明请参考：`../SKILL使用手册.md`

## Reference 文件

| 文件 | 用途 |
|---|---|
| `SKILL.md` | skill 完整定义和模块规范 |
| `references/source-reading.md` | 输入来源读取规则 |
| `references/case-layering-strategy.md` | 案例分层策略 |
| `references/self-checkpoint-review.md` | 检查点审查规则 |
| `references/self-test-checkpoints.md` | 共享检查点清单（68项） |
| `references/test-asset-coverage.md` | 测试资产覆盖分析规则 |
| `references/report-output.md` | 报告输出规范 |
| `references/lark-document-source.md` | 飞书文档来源与权限配置 |
| `references/manual-evidence.md` | 人工证据收集规则 |