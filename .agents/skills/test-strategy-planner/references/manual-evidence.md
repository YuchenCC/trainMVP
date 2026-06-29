# SIT 人工验证证据采集规则

## 适用场景

当 UI 自动化成本过高、执行很慢或需要真实 SIT 环境验证时，允许用人工验证替代低风险 UI 自动化。人工验证不能替代单元测试覆盖率，也不能替代关键接口契约测试。

## 两档证据模式

| 模式 | 默认策略 | 目录结构 | 适用场景 |
|---|---|---|---|
| 轻量人工验证 | 默认使用 | `evidence/{scope}/summary.md` + 公共附件目录 | 日常 SIT 验证、研发自测、测试补充验证 |
| 完整证据包 | 仅在用户明确要求时使用 | `evidence/{scope}/{case-id}/summary.md` + 每案例附件目录 | 正式验收、审计、需要逐案例归档 |

除非用户明确说“正式验收、审计、完整证据包、按案例拆分”，否则不要按每个案例创建一套目录。

## 询问和自动建目录流程

当策略规划发现某些 UI 场景可由人工验证替代时，必须先问用户：

```markdown
这些 UI 场景可以用 SIT 人工验证替代自动化。是否创建轻量人工验证证据包？

如果需要，我会创建：
- evidence/{scope}/summary.md
- evidence/{scope}/screenshots/
- evidence/{scope}/logs/（可选，失败或需要后端取证时使用）
- evidence/{scope}/db/（可选，涉及写操作时使用）
- evidence/{scope}/api/（可选，需要接口证据时使用）

默认所有人工验证结论都写在一个 summary.md 里，不按每个案例拆目录。
```

只有用户明确回复“要、需要、可以、启用、走人工验证”等确认语义后，才创建目录。

## 轻量目录结构

```text
evidence/{scope}/
  summary.md
  screenshots/
  logs/
  db/
  api/
```

目录用途：

| 目录/文件 | 用途 | 是否必须 |
|---|---|---|
| `summary.md` | 记录所有人工验证案例、结论、证据链接和风险 | 必须 |
| `screenshots/` | 页面、按钮、弹窗、权限显隐截图 | 通常必须 |
| `logs/` | 服务端日志、网关日志、日志平台导出结果 | 失败、异常、后端链路时必须 |
| `db/` | SQL、查询结果、数据变化截图或 CSV | 涉及写操作时必须 |
| `api/` | HAR、curl、Postman/JMeter 结果、接口响应摘要 | 需要接口取证时使用 |

## summary.md 模板

```markdown
# {scope} SIT 人工验证 Summary

## 基本信息

| 项目 | 内容 |
|---|---|
| 验证环境 | SIT：{url/build/branch/commit} |
| 验证人 |  |
| 验证时间 |  |
| 测试账号 | 账号/角色，不记录密码 |
| 关联 ID | traceId/requestId/userId/业务ID/时间窗口 |
| 总结论 | 通过 / 失败 / 阻塞 |

## 验证结论

| 案例编号 | 场景 | 验证方式 | 结论 | 证据 | 备注 |
|---|---|---|---|---|---|
| TC-001 |  | 人工截图 | 通过 / 失败 / 阻塞 | screenshots/xxx.png |  |
| TC-002 |  | 人工截图 + 日志 | 通过 / 失败 / 阻塞 | screenshots/xxx.png；logs/xxx.log |  |

## 失败/阻塞说明

| 案例编号 | 问题 | 影响 | 处理建议 |
|---|---|---|---|
|  |  |  |  |

## 附件清单

| 类型 | 文件 | 说明 |
|---|---|---|
| 截图 | screenshots/ | 关键页面、按钮、弹窗、结果页 |
| 日志 | logs/ | 按 traceId/requestId/userId/时间窗口提取 |
| 数据库 | db/ | 操作前后 SQL 和结果 |
| 接口 | api/ | HAR、curl、JMeter、网关日志 |

## 风险说明

- 无 / 有：
```

## 证据最小集合

| 验证内容 | 最小证据 | 说明 |
|---|---|---|
| 页面字段展示 | 截图 + `summary.md` 结论 | 截图要包含页面标题、关键字段和时间 |
| 按钮/权限显隐 | 不同角色截图 + `summary.md` 结论 | 权限场景建议至少保留有权限/无权限两个角色 |
| 查询/筛选/分页 | 截图 + 查询条件记录 | 如后端分页有争议，补接口响应或日志 |
| 写操作 | 截图 + DB 前后结果 + 日志 | 写操作不能只留截图 |
| 失败/异常 | 截图 + 日志 + 关联 ID | 必须能定位到服务端日志 |
| 接口链路 | HAR/API 响应 + 关联 ID | 可放到 `api/` 目录 |

## 日志查询建议

人工验证前先确定一个关联键，优先级：

1. `traceId` / `requestId` / `correlationId`
2. 当前登录 `userId`
3. 业务主键，如 `requirementId`、`trainId`、`scheduleId`
4. 精确时间窗口，例如 `2026-06-28 14:00:00` 到 `14:10:00`

建议在 `summary.md` 的“关联 ID”中写清楚本次用哪个键取证。

### 按 traceId/requestId 查询

```bash
# 示例：按 traceId 提取应用日志
grep "TRACE_ID" app.log > evidence/{scope}/logs/trace-TRACE_ID.log
```

### 按用户和时间窗口查询

```bash
# 示例：按时间窗口和 userId 提取日志
awk '/2026-06-28 14:00/,/2026-06-28 14:10/' app.log | grep "userId" > evidence/{scope}/logs/user-time-window.log
```

### 使用日志平台

如果使用 ELK、Loki、云日志平台或 APM，建议导出：

- 查询条件截图或查询语句。
- 查询结果截图或 CSV。
- 关键异常栈、接口路径、状态码、traceId。
- 与 `summary.md` 中案例编号对应的说明。

## 数据库变化提取建议

涉及写操作时，用只读账号保留操作前后数据。

```sql
-- 操作前
select id, status, updated_at from train_schedules where id = :scheduleId;

-- 操作后
select id, status, updated_at from train_schedules where id = :scheduleId;
```

证据中记录 SQL、执行时间和结果。涉及多表副作用时，要查主表和关键关联表。

## 接口证据提取建议

可选方式：

- 浏览器 Network 导出 HAR。
- 网关/API 日志按 requestId 导出。
- curl/Postman/JMeter 执行结果导出。

接口证据至少包含 URL、方法、状态码、关键请求参数、关键响应字段。

## 完整证据包模式

只有用户明确要求“完整证据包、按案例拆分、正式验收、审计”时，才使用如下结构：

```text
evidence/{scope}/{case-id}/
  summary.md
  screenshots/
  logs/
  db/
  api/
```

完整模式下每个案例单独一个 `summary.md`。日常 SIT 验证不要默认使用完整模式。

## 策略报告中的写法

当用人工验证替代 UI 自动化时，在策略报告中写清楚：

| UI 场景 | 替代方式 | summary.md 路径 | 必须证据 | 风险 |
|---|---|---|---|---|
| 字段展示/低风险弹窗 | 人工验证 | `evidence/{scope}/summary.md` | 截图 + SIT 版本 + 验证人 | 低 |
| 涉及写操作的页面按钮 | 人工验证 + API/DB 证据 | `evidence/{scope}/summary.md` | 截图 + 日志 + DB 前后结果 | 中 |
| 权限显隐 | 优先自动化；若人工替代需多角色截图 | `evidence/{scope}/summary.md` | 不同角色截图 + 日志 | 中高 |