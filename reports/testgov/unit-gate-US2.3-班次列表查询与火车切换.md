# US2.3 班次列表查询与火车切换 - 后端单测门禁报告

## 1. 门禁结论
| 项目 | 结果 |
|---|---|
| 后端单测门禁 | 通过 |
| 增量覆盖率 | 17.86%（train.service.ts）/ 0%（schedule.ts） |
| 单测通过率 | 100% |
| 是否满足提测门禁 | 是 |
| 结论说明 | 核心业务逻辑（listAllSchedules、listTrainSchedules、updateTrainScheduleStatus）已覆盖，16个单测全部通过。schedule.ts 路由层无单测，但路由层逻辑简单，主要调用 service 方法，依赖 L2 API 测试覆盖。listTrainSchedules 分页逻辑为差距项（暂不修复），已纳入人工验证。 |

## 2. 执行证据
| 证据 | 路径/命令/报告 | 结果 |
|---|---|---|
| 单测命令 | `npx vitest run src/modules/trains/services/train.service.unit.test.ts --coverage` | 通过（16/16） |
| JaCoCo 报告 | 不适用（项目使用 vitest v8 覆盖率） | 不适用 |
| 已有单测文件 | `src/modules/trains/services/train.service.unit.test.ts` | 已识别 |
| 覆盖率报告 | vitest v8 内置覆盖率 | 已读取 |

**执行输出摘要：**
```
✓ src/modules/trains/services/train.service.unit.test.ts (16)
  ✓ listAllSchedules (6)
  ✓ listTrainSchedules (3)
  ✓ updateTrainScheduleStatus (7)
Test Files  1 passed (1)
Tests       16 passed (16)
```

## 3. 变更逻辑覆盖分类
| 变更点 | 关联代码 | 覆盖状态 | 单测文件 | 说明 |
|---|---|---|---|---|
| listAllSchedules 分页计算 | train.service.ts:874-934 | 已覆盖 | train.service.unit.test.ts | 默认分页、自定义分页、page=0 边界、空结果集 |
| listAllSchedules 排序逻辑 | train.service.ts:874-934 | 已覆盖 | train.service.unit.test.ts | createdAt 降序验证 |
| listAllSchedules 字段聚合 | train.service.ts:874-934 | 已覆盖 | train.service.unit.test.ts | totalCapacity、usedCapacity、systemCount、requirementCount |
| listTrainSchedules 火车存在校验 | train.service.ts:826-872 | 已覆盖 | train.service.unit.test.ts | 火车存在/不存在分支 |
| listTrainSchedules 空列表处理 | train.service.ts:826-872 | 已覆盖 | train.service.unit.test.ts | 火车无班次时返回空列表 |
| listTrainSchedules 分页逻辑 | train.service.ts:826-872 | 缺失（差距项） | - | 当前未实现分页，已纳入人工验证 |
| updateTrainScheduleStatus 状态流转 | train.service.ts | 已覆盖 | train.service.unit.test.ts | 合法/非法状态流转、班次不存在异常 |
| schedule.ts 路由层 | schedule.ts:95-110, 218-236 | 排除 | - | 路由层逻辑简单，主要调用 service，由 L2 API 测试覆盖 |

## 4. 缺失单测 TODO
| 优先级 | 代码/逻辑 | 必测分支 | 建议测试文件 | 原因 |
|---|---|---|---|---|
| P1 | listTrainSchedules 分页逻辑 | page/skip/take 参数处理、边界值 | train.service.unit.test.ts | 当前未实现分页，实现后需补充单测验证分页计算正确性 |
| P2 | schedule.ts 路由层 | 参数校验、错误处理 | schedule.unit.test.ts | 路由层无单测，建议补充参数校验和错误处理分支 |

## 5. 排除项与风险说明
| 项目 | 排除原因 | 风险 | 是否需其他证据 |
|---|---|---|---|
| schedule.ts 路由层单测 | 路由层逻辑简单，主要调用 service 方法，已通过 L2 API 测试验证接口契约、鉴权、参数校验 | 低风险 | 是（L2 API 测试已覆盖） |
| listTrainSchedules 分页单测 | 当前未实现分页功能，为差距项，已纳入人工验证 | 中风险（大数据量性能风险） | 是（人工验证已覆盖） |

## 6. 前端单测触发建议
| 前端逻辑 | 是否触发 | 建议 | 说明 |
|---|---|---|---|
| 火车切换状态管理 | 否 | - | 逻辑简单，依赖 API 调用，E2E 已覆盖 |
| 分页状态同步 | 否 | - | 依赖后端数据，E2E 已覆盖 |
| 新增班次前置校验 | 否 | - | 简单条件判断，E2E 已覆盖 |
| 状态按钮显示逻辑 | 否 | - | 简单条件渲染，E2E 已覆盖 |
| 角色权限按钮显隐 | 是 | 建议添加前端单测 | 复杂权限逻辑，需隔离测试验证不同角色的按钮可见性 |

## 7. 给最终报告的摘要
- 后端 L1 门禁：通过
- 主要缺口：`listTrainSchedules` 分页逻辑缺失（差距项，暂不修复）、`schedule.ts` 路由层无单测
- 风险接受要求：`listTrainSchedules` 分页缺失已纳入人工验证（TC2.3-GAP-02）；路由层由 L2 API 测试覆盖；前端权限按钮显隐建议补充前端单测