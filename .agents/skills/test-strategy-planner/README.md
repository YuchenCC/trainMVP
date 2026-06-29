# test-strategy-planner 使用说明

这个 skill 用来把需求、用户故事、测试案例、代码影响范围整理成测试策略报告。默认优先级是：单元测试优先，其次 API 自动化，最后 UI 自动化或 SIT 人工验证。

## 人工验证现在怎么做

默认走轻量模式，只生成一个总的结论文件：

```text
evidence/{scope}/
  summary.md
  screenshots/
  logs/
  db/
  api/
```

所有人工验证案例都写在 `summary.md` 的“验证结论”表里。截图、日志、数据库结果、接口结果只作为附件放到对应目录。

只有正式验收、审计、或明确要求“按案例拆分”时，才按每个案例创建独立目录。

## 人工需要做哪些事

1. 在 SIT 环境执行页面验证。
2. 把关键截图放到 `screenshots/`。
3. 如果是失败、异常、写操作或后端链路问题，把日志放到 `logs/`。
4. 如果涉及数据变化，把 SQL 和结果放到 `db/`。
5. 如果需要接口证据，把 HAR、curl、JMeter 或接口响应摘要放到 `api/`。
6. 在 `summary.md` 里填写每个案例的结论、证据路径和备注。

## 日志查询建议

取日志前先确定一个关联键，优先级如下：

1. `traceId` / `requestId` / `correlationId`
2. 当前登录 `userId`
3. 业务主键，如 `requirementId`、`trainId`、`scheduleId`
4. 精确时间窗口，例如 `2026-06-28 14:00:00` 到 `14:10:00`

建议把关联键写进 `summary.md` 的“关联 ID”字段。

### 按 traceId/requestId 查日志

```bash
grep "TRACE_ID" app.log > evidence/{scope}/logs/trace-TRACE_ID.log
```

### 按用户和时间窗口查日志

```bash
awk '/2026-06-28 14:00/,/2026-06-28 14:10/' app.log | grep "userId" > evidence/{scope}/logs/user-time-window.log
```

### 用日志平台查

如果使用 ELK、Loki、云日志平台或 APM，建议保存这些证据：

| 证据 | 建议 |
|---|---|
| 查询条件 | 截图或复制查询语句 |
| 查询结果 | 导出 CSV 或截图 |
| 关键字段 | traceId、接口路径、状态码、异常栈、用户 ID、业务 ID |
| 对应关系 | 在 `summary.md` 里写明对应哪个案例 |

## 数据库变化建议

涉及新增、修改、删除、状态流转时，保留操作前后查询结果。

```sql
-- 操作前
select id, status, updated_at from train_schedules where id = :scheduleId;

-- 操作后
select id, status, updated_at from train_schedules where id = :scheduleId;
```

只读查询即可，不建议人工验证时直接改数据库。