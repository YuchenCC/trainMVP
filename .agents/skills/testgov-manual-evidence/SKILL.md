---
name: testgov-manual-evidence
description: 创建并治理 TestGov 轻量 SIT 人工验证证据。用于用户确认需要人工验证时，创建 summary.md、截图、API/Network 证据、日志证据，以及在资金、库存、容量、关键状态、审计合规等场景下的条件性 DB 截图证据。
---

# TestGov Manual Evidence

## 用途

仅在用户确认需要人工验证后使用。执行前必须询问用户是否要人工验证；用户确认后再创建证据目录。

默认执行人：测试人员。审核人：测试负责人；高风险发布证据可由项目经理参与审核。

人工验证不能抵扣后端单测门禁。

## 默认轻量证据包

默认创建：

```text
evidence/{scope}/
  summary.md
  screenshots/
  api/
  logs/
```

默认不创建 `db/`。不要要求数据库地址或数据库账号密码。

## DB 证据触发规则

只有以下场景才创建 `evidence/{scope}/db/`：

- 资金、支付、退款、结算、扣减。
- 库存、余量、配额、容量。
- 关键状态流转。
- 审计或合规记录。
- 异步最终一致性。

模型不连接数据库。由人工提供脱敏后的前后截图，并在 `summary.md` 中说明查询口径。

## 人工步骤要简单

给用户的人工指引必须控制在 3 到 5 步：

1. 在 SIT/UAT 环境按测试案例操作。
2. 保存关键页面截图到 `screenshots/`。
3. 如有接口或网络证据，保存到 `api/`。
4. 如需日志，保存关键日志片段到 `logs/`。
5. 只有触发 DB 规则时，保存脱敏 DB 前后截图到 `db/`。

不要要求用户整理复杂表格；summary.md 由 skill 维护。

## summary.md 必须包含

| 字段 | 要求 |
|---|---|
| 范围 | 需求 / 用户故事 / 测试案例范围 |
| 环境 | SIT/UAT/本地，安全时可写 URL |
| 账号 | 只写角色，敏感账号脱敏 |
| 案例 | 已验证案例和结果 |
| 证据链接 | screenshots/api/logs/db，如适用 |
| 结论 | 通过/失败/阻塞 |
| 风险 | 残余风险和责任人 |

## 输出

写入或更新：

```text
evidence/{scope}/summary.md
reports/testgov/manual-evidence-{scope}.md
```

回复中说明已创建什么、还需要人工补什么证据。
## 输出模板规则

生成输出文件前，必须先读取本 skill 自带模板：

```text
references/output-template.md
```

按模板结构输出。没有证据的字段写 `缺失`、`待确认` 或 `不适用`，不得编造结果。
