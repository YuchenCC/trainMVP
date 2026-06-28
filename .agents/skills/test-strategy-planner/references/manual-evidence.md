# SIT 人工验证证据采集规则

## 适用场景

当 UI 自动化成本过高、执行很慢或需要真实 SIT 环境验证时，允许用人工验证替代低风险 UI 自动化。人工验证不能替代单元测试覆盖率，也不能替代关键接口契约测试。


## 询问和自动建目录流程

当策略规划发现某些 UI 场景可由人工验证替代时，必须先问用户：

```markdown
这些 UI 场景可以用 SIT 人工验证替代自动化。是否需要我创建人工验证证据包目录和每个案例的填写指引？

如果需要，我会创建：
- evidence/{scope}/{case-id}/screenshots
- evidence/{scope}/{case-id}/logs
- evidence/{scope}/{case-id}/db
- evidence/{scope}/{case-id}/api
- evidence/{scope}/{case-id}/summary.md
```

只有用户明确回复“要、需要、可以、启用、走人工验证”等确认语义后，才创建目录。

创建规则：

- 根目录：`evidence/{scope}/`
- 每个需要人工验证的案例一个子目录：`evidence/{scope}/{case-id}/`
- 每个案例目录固定包含：`screenshots/`、`logs/`、`db/`、`api/`、`summary.md`
- `summary.md` 必须预填案例编号、案例名称、环境、验证人、时间、账号、关联 ID、步骤、证据清单、结论。
- 如果只生成策略报告、不执行人工验证准备，不创建 evidence 目录。

目录创建后，对话回复必须给出 evidence 根目录路径，并说明每个案例只需要填写 `summary.md` 和放入截图/日志/DB/API 证据。

## summary.md 模板

```markdown
# {case-id} {case-title}

## 基本信息

| 项目 | 内容 |
|---|---|
| 验证环境 | SIT：{url/build/branch/commit} |
| 验证人 |  |
| 验证时间 |  |
| 测试账号 | 账号/角色，不记录密码 |
| 关联 ID | traceId/requestId/userId/业务ID/时间窗口 |
| 结论 | 通过 / 失败 / 阻塞 |

## 操作步骤

1. 
2. 
3. 

## 预期结果

- 

## 实际结果

- 

## 证据清单

| 类型 | 文件 | 说明 |
|---|---|---|
| 截图 | screenshots/ | 关键页面或弹窗 |
| 日志 | logs/ | 如涉及后端或异常 |
| 数据库 | db/ | 如涉及写操作 |
| 接口 | api/ | HAR、curl、JMeter 或网关日志 |

## 风险说明

- 无 / 有：
```
## 证据最小集合

| 证据 | 必填 | 说明 |
|---|---|---|
| 验证环境 | 是 | SIT 地址、版本号、分支、构建号、提交号 |
| 验证人和时间 | 是 | 记录执行人、开始/结束时间 |
| 测试账号 | 是 | 角色、账号，不记录密码 |
| 操作步骤 | 是 | 对应测试案例编号和步骤 |
| 页面截图或录屏 | 是 | 关键页面、弹窗、按钮、结果页 |
| 接口请求/响应 | 建议 | 浏览器 Network HAR、网关日志、接口响应摘要 |
| 服务器日志 | 涉及后端时必填 | 按 traceId/requestId/userId/time window 提取 |
| 数据库变化 | 涉及写操作时必填 | 操作前后 SQL 查询结果或导出 CSV |
| 结论 | 是 | 通过、失败、阻塞、风险说明 |

## 自动提取证据的方法

### 1. 统一关联 ID

人工验证前先确定一个关联键，优先级：

1. traceId / requestId / correlationId
2. 当前登录 userId
3. 业务主键，如 requirementId、trainId、scheduleId
4. 精确时间窗口，例如 `2026-06-28 14:00:00` 到 `14:10:00`

报告中必须写明使用哪个关联键取证。

### 2. 服务器日志提取

建议通过跳板机或日志平台按时间窗口和关联 ID 提取：

```bash
# 示例：按 traceId 提取应用日志
grep "TRACE_ID" app.log > evidence/logs/TC2.3-xxx-app.log

# 示例：按时间窗口和用户提取
awk '/2026-06-28 14:00/,/2026-06-28 14:10/' app.log | grep "userId" > evidence/logs/TC2.3-xxx-user.log
```

如果使用 ELK、Loki、云日志平台，应导出查询条件、结果截图或 CSV。

### 3. 数据库变化提取

写操作必须保留操作前后数据。建议使用只读账号执行 SQL：

```sql
-- 操作前
select id, status, updated_at from train_schedules where id = :scheduleId;

-- 操作后
select id, status, updated_at from train_schedules where id = :scheduleId;
```

证据中记录 SQL、执行时间、结果。涉及多表副作用时，要查主表和关键关联表。

### 4. 接口证据提取

可选方式：

- 浏览器 Network 导出 HAR。
- 网关/API 日志按 requestId 导出。
- curl/Postman/JMeter 执行结果导出。

接口证据至少包含 URL、方法、状态码、关键请求参数、关键响应字段。

### 5. 证据目录建议

```text
evidence/{scope}/{case-id}/
  screenshots/
  logs/
  db/
  api/
  summary.md
```

`summary.md` 建议包含：测试案例编号、验证人、环境、版本、时间、关联 ID、操作步骤、证据文件列表、结论。

## 策略报告中的写法

当用人工验证替代 UI 自动化时，在策略报告中写清楚：

| UI 场景 | 替代方式 | 必须证据 | 风险 |
|---|---|---|---|
| 字段展示/低风险弹窗 | 人工验证 | 截图 + SIT 版本 + 验证人 | 低 |
| 涉及写操作的页面按钮 | 人工验证 + API/DB 证据 | 截图 + 日志 + DB 前后结果 | 中 |
| 权限显隐 | 优先自动化；若人工替代需多角色截图 | 不同角色截图 + 日志 | 中高 |