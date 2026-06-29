# testgov-manual-evidence 输出模板

证据目录：`evidence/{scope}/summary.md`
报告文件：`reports/testgov/manual-evidence-{scope}.md`

## summary.md 模板

```markdown
# {scope} 人工验证证据 Summary

## 1. 验证结论
| 项目 | 内容 |
|---|---|
| 验证范围 |  |
| 环境 | SIT/UAT/本地 |
| 验证账号/角色 | 仅写角色或脱敏账号 |
| 结论 | 通过/失败/阻塞 |
| 风险 |  |

## 2. 人工验证步骤
| 步骤 | 操作 | 结果 | 证据 |
|---|---|---|---|
| 1 |  | 通过/失败 | screenshots/xxx.png |

## 3. 测试案例结果
| 案例 | 场景 | 结果 | 证据 |
|---|---|---|---|
|  |  | 通过/失败/阻塞 |  |

## 4. 证据索引
| 类型 | 文件 | 说明 |
|---|---|---|
| 截图 | screenshots/ |  |
| API/Network | api/ |  |
| 日志 | logs/ |  |
| DB 截图 | db/ | 仅触发 DB 规则时填写 |

## 5. 残余风险
| 风险 | 影响 | 责任人 | 是否接受 |
|---|---|---|---|
|  |  |  | 是/否 |
```

## manual-evidence 报告模板

```markdown
# {scope} 人工验证报告

## 1. 已创建证据目录
- `evidence/{scope}/summary.md`
- `evidence/{scope}/screenshots/`
- `evidence/{scope}/api/`
- `evidence/{scope}/logs/`
- `evidence/{scope}/db/`：仅触发 DB 规则时创建

## 2. 需要人工补充的证据
| 证据 | 放置目录 | 说明 |
|---|---|---|
| 页面截图 | screenshots/ |  |
| API/Network | api/ | 可选 |
| 日志 | logs/ | 可选 |
| DB 脱敏截图 | db/ | 仅资金/库存/容量/关键状态/审计/异步一致性场景 |

## 3. 给最终报告的摘要
- 人工验证结论：
- 证据完整性：
- 主要风险：
```