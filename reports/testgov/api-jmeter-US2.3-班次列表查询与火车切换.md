# US2.3 班次列表查询与火车切换 - API/JMeter 覆盖报告

## 1. 结论摘要
| 项目 | 结论 |
|---|---|
| API 覆盖状态 | 已覆盖 |
| 执行结果 | 通过 |
| 失败接口数 | 0 |
| 阻塞项 | 无 |

## 2. 执行信息
| 项目 | 内容 |
|---|---|
| 环境 | 本地开发环境 |
| 分支/commit | main / 当前 HEAD |
| JMeter 脚本 | 不适用（用户确认不需要补充） |
| 执行报告 | vitest API 测试执行结果 |

**执行命令：**
```bash
npx vitest run src/__tests__/t2-us2.3-schedule-api.test.ts --reporter=verbose
```

**执行结果：**
```
✓ src/__tests__/t2-us2.3-schedule-api.test.ts (14)
Tests  14 passed (14)
Duration  4.12s
```

## 3. 接口覆盖矩阵
| 接口/场景 | 关联需求 | 测试案例 | 当前证据 | 结果 | 缺口 |
|---|---|---|---|---|---|
| GET /api/schedules | BR2.3.1, BR2.3.4, BR2.3.5 | TC2.3-API-01 | API 测试已覆盖 | 通过 | 无 |
| GET /api/schedules?page=&pageSize= | BR2.3.4 | TC2.3-API-02 | API 测试已覆盖 | 通过 | 无 |
| GET /api/schedules (排序) | BR2.3.5 | TC2.3-API-03 | API 测试已覆盖 | 通过 | 无 |
| GET /api/trains/:trainId/schedules | BR2.3.3, BR2.3.6 | TC2.3-API-04 | API 测试已覆盖 | 通过 | 无分页参数 |
| GET /api/trains/not-exist/schedules | BR2.3.6 | TC2.3-API-05 | API 测试已覆盖 | 通过 | 无 |
| GET /api/schedules (未登录) | BR2.3.8 | TC2.3-API-06 | API 测试已覆盖 | 通过 | 无 |
| GET /api/trains/:trainId/schedules (未登录) | BR2.3.8 | TC2.3-API-06 | API 测试已覆盖 | 通过 | 无 |
| POST /api/trains/:trainId/schedules (权限) | BR2.3.9 | TC2.3-API-07 | API 测试已覆盖 | 通过 | 无 |
| POST /api/trains/:trainId/schedules/:scheduleId/status (权限) | BR2.3.10 | TC2.3-API-08 | API 测试已覆盖 | 通过 | 无 |

## 4. 失败与阻塞
| 类型 | 接口/场景 | 现象 | 影响 | 责任人 |
|---|---|---|---|---|
| - | - | - | - | - |

## 5. 补测 TODO
| 优先级 | TODO | 建议脚本 | 说明 |
|---|---|---|---|
| P1 | GET /api/trains/:trainId/schedules 分页参数 | t2-us2.3-schedule-api.test.ts | 当前接口未实现分页，实现后需补充分页参数测试 |

## 6. 给最终报告的摘要
- L2 API 覆盖：已覆盖，14个测试用例全部通过
- 主要风险：GET /api/trains/:trainId/schedules 接口未实现分页，大数据量时有性能风险（已纳入人工验证 TC2.3-GAP-02）