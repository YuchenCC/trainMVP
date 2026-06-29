# US2.3 班次列表查询与火车切换 - 测试覆盖分析

## 1. 结论摘要
| 项目 | 结论 |
|---|---|
| 需求覆盖状态 | 部分覆盖 |
| 后端 L1 单测候选 | 有 |
| L2 API 覆盖缺口 | 无 |
| L3 UI 覆盖缺口 | 有（差距项未覆盖） |
| 人工验证候选 | 有（3个差距项） |
| 主要风险 | 前端权限按钮未按角色隐藏，存在越权操作风险；按火车查询班次不分页，大数据量时性能风险 |

## 2. 分析范围与证据来源
| 证据 | 路径/来源 | 状态 |
|---|---|---|
| specs | `reports/testgov/specs-US2.3-班次列表查询与火车切换.md` | 已读取 |
| 需求/设计 | `03-需求与设计/Task2-版本火车管理/US详细设计/RT-T2-US2.3-版本火车列表-详细设计_v1.0_20260516.md` | 已读取 |
| 测试案例 | `03-需求与设计/Task2-版本火车管理/测试案例/RT-T2-US2.3-班次列表查询与火车切换-测试案例_v1.1_20260516.md` | 已读取 |
| 后端代码 | `release-train/apps/server/src/modules/trains/routes/schedule.ts` | 已读取 |
| 后端代码 | `release-train/apps/server/src/modules/trains/services/train.service.ts` | 已读取 |
| 前端代码 | `release-train/apps/web/src/pages/trains/schedules/index.tsx` | 已读取 |
| 前端代码 | `release-train/apps/web/src/services/train.ts` | 已读取 |

## 3. 需求覆盖摘要
| 需求/用户故事 | 测试案例 | 覆盖状态 | 说明 |
|---|---|---|---|
| US2.3 班次列表查询与火车切换 | TC2.3-API-01 ~ TC2.3-API-08（8个） | 已覆盖 | 后端接口测试完整覆盖 |
| US2.3 班次列表查询与火车切换 | TC2.3-FE-01 ~ TC2.3-FE-12（12个） | 已覆盖 | 前端功能测试完整覆盖 |
| US2.3 差距项 - 所属火车列展示 | TC2.3-GAP-01 | 缺失 | 前端未展示，需人工验证 |
| US2.3 差距项 - 按火车查询分页 | TC2.3-GAP-02 | 缺失 | 后端未实现分页，需人工验证 |
| US2.3 差距项 - 前端权限按钮 | TC2.3-GAP-03 | 缺失 | 前端未按角色隐藏，需人工验证 |

## 4. 分层测试方案
| 测试点 | 推荐层级 | 原因 | 当前证据 | 缺口 |
|---|---|---|---|---|
| 全局班次列表查询逻辑 | L1 | 分页计算、排序、关联查询逻辑 | 已有 unit-test | 无 |
| 按火车查询班次逻辑 | L1 | 火车存在校验、关联查询 | 已有 unit-test | 无分页参数处理 |
| 班次状态流转 | L1 | 状态机转换、异常分支 | 已有 unit-test | 无 |
| GET /api/schedules | L2 | 接口契约、鉴权、参数校验 | 已有 API 测试 | 无 |
| GET /api/trains/:trainId/schedules | L2 | 接口契约、参数校验 | 已有 API 测试 | 无分页 |
| 班次列表页加载与展示 | L3 | 用户核心流程 | 已有 E2E | 无 |
| 火车切换交互 | L3 | 核心交互流程 | 已有 E2E | 无 |
| 所属火车列展示 | M | 视觉展示确认 | 缺失 | 需人工验证 |
| 按火车查询分页 | M | 大数据量场景验证 | 缺失 | 需人工验证 |
| 前端权限按钮显隐 | M | 角色权限验证 | 缺失 | 需人工验证 |

## 5. 代码影响测试矩阵
| 代码影响点 | 关联需求 | 推荐测试方式 | 当前证据 | TODO |
|---|---|---|---|---|
| `schedule.ts:95-110` GET /api/schedules | BR2.3.1, BR2.3.4, BR2.3.5 | L2 API 自动化 | 已有 API 测试 | 无 |
| `schedule.ts:218-236` GET /api/trains/:trainId/schedules | BR2.3.3, BR2.3.6 | L2 API 自动化 | 已有 API 测试 | 需补充分页参数 |
| `train.service.ts:826-872` listTrainSchedules | BR2.3.3, BR2.3.6 | L1 后端单测 | 已有 unit-test | 需补充分页逻辑 |
| `train.service.ts:874-934` listAllSchedules | BR2.3.1, BR2.3.4, BR2.3.5 | L1 后端单测 | 已有 unit-test | 无 |
| `schedules/index.tsx:98-107` loadTrainList | BR2.3.2 | L3 E2E | 已有 E2E | 无 |
| `schedules/index.tsx:109-140` loadScheduleList | BR2.3.1, BR2.3.3 | L3 E2E | 已有 E2E | 无 |
| `schedules/index.tsx:158-191` handleTrainChange | BR2.3.3 | L3 E2E | 已有 E2E | 无 |
| `schedules/index.tsx:288-388` scheduleColumns | BR2.3.7 | M 人工验证 | 缺失 | 需添加所属火车列 |
| `schedules/index.tsx:357-388` 操作按钮渲染 | BR2.3.9, BR2.3.10 | M 人工验证 | 缺失 | 需按角色控制 |

## 6. 需传给 unit-gate 的后端单测项
| 代码/逻辑 | 建议单测原因 | 必测分支 | 备注 |
|---|---|---|---|
| `listAllSchedules` 分页计算 | 核心业务逻辑，涉及 skip/take 计算 | page=1, page>1, pageSize=默认/自定义 | 已覆盖 |
| `listAllSchedules` 排序逻辑 | 业务规则要求按创建时间倒序 | createdAt 降序验证 | 已覆盖 |
| `listTrainSchedules` 火车存在校验 | 异常分支，火车不存在时抛错 | 火车存在/不存在 | 已覆盖 |
| `listTrainSchedules` 容量计算 | 涉及 snapshots 聚合计算 | 有/无快照数据 | 已覆盖 |
| `listTrainSchedules` 分页逻辑 | 当前未实现，需补充 | page/skip/take 参数 | 差距项 |

## 7. 前端单测触发建议
| 前端逻辑 | 是否触发 | 原因 | 建议 |
|---|---|---|---|
| 火车切换状态管理 | 否 | 逻辑简单，依赖 API 调用 | E2E 已覆盖 |
| 分页状态同步 | 否 | 依赖后端数据 | E2E 已覆盖 |
| 新增班次前置校验 | 否 | 简单条件判断 | E2E 已覆盖 |
| 状态按钮显示逻辑 | 否 | 简单条件渲染 | E2E 已覆盖 |
| 角色权限按钮显隐 | 是 | 复杂权限逻辑，需隔离测试 | 建议添加前端单测验证权限按钮显隐 |

## 8. API/JMeter 任务
| 接口/场景 | 覆盖状态 | 建议 |
|---|---|---|
| GET /api/schedules | 已覆盖 | 已有 API 测试，无需补充 |
| GET /api/schedules?page=&pageSize= | 已覆盖 | 已有 API 测试，无需补充 |
| GET /api/trains/:trainId/schedules | 已覆盖 | 已有 API 测试，无需补充 |
| GET /api/trains/not-exist/schedules | 已覆盖 | 已有 API 测试，无需补充 |
| POST /api/trains/:trainId/schedules（权限） | 已覆盖 | 已有 API 测试，无需补充 |
| POST /api/trains/:trainId/schedules/:scheduleId/status（权限） | 已覆盖 | 已有 API 测试，无需补充 |
| GET /api/schedules（未登录） | 已覆盖 | 已有 API 测试，无需补充 |

## 9. UI 自动化与人工验证任务
| 场景 | 建议方式 | 原因 | 证据要求 |
|---|---|---|---|
| 班次列表页默认加载 | L3 | 核心用户流程 | E2E 测试截图 |
| 火车下拉框加载与切换 | L3 | 核心交互 | E2E 测试截图 |
| 班次列表字段展示 | L3 | 核心展示 | E2E 测试截图 |
| 状态按钮显示 | L3 | 核心交互 | E2E 测试截图 |
| 所属火车列展示 | M | 差距项，需确认当前状态 | 页面截图 |
| 按火车查询分页 | M | 差距项，需确认当前状态 | API 响应截图 |
| 前端权限按钮显隐 | M | 差距项，需确认当前状态 | 不同角色登录后的页面截图 |

## 10. 风险与 TODO
| 优先级 | TODO | 责任人 | 下游 skill |
|---|---|---|---|
| P0 | 前端操作按钮未按角色隐藏，非管理员可见管理按钮 | 前端开发 | testgov-manual-evidence |
| P1 | 按火车查询班次接口未实现分页，大数据量时有性能风险 | 后端开发 | testgov-manual-evidence |
| P1 | 班次列表未展示所属火车列，影响全局班次识别 | 前端开发 | testgov-manual-evidence |
| P2 | 前端单测建议：角色权限按钮显隐逻辑 | 前端开发 | - |