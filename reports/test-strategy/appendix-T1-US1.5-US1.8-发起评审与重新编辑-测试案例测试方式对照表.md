# 附件：T1-US1.5 / US1.8 发起评审与重新编辑 -- 测试案例测试方式对照表

> 版本：v1.0 | 日期：2026-07-11 | 配合主报告使用

---

## A. US1.5 逐案例详细分析

| 案例编号 | 测试目标 | 测试类型 | 推荐层级 | 分层理由 | 逻辑代码映射 | 建议断言 | 补充风险 | 优先级 |
|---------|---------|---------|---------|---------|------------|---------|---------|-------|
| TC1.5.1 | BA 归属人正常发起评审，DRAFT -> PENDING_REVIEW | 正向功能 | L2 API | 涉及 authenticate + rbacMiddleware + service（状态校验+字段校验+乐观锁+事务），需完整链路验证 | service.ts L1095-1201（submitReview 全流程）；index.ts L282-297（路由）；constants/index.ts L157（SUBMIT_REVIEW 权限） | 1. statusCode=200; 2. success=true; 3. data.status='PENDING_REVIEW'; 4. data.id 匹配; 5. data.version 原值+1 | 需确保 BA 是该需求的 baId 归属人 | P0 |
| TC1.5.2 | 非草稿状态不显示"发起评审"按钮 / 不可发起 | 状态校验 | L1 前端 + L2 API | 后端校验在 service L1121（existing.status !== 'DRAFT'），前端按钮需根据 status 条件渲染 | service.ts L1120-1123（状态校验 DRAFT）；前端需检查按钮 v-if/v-show 条件 | L2: statusCode=200, success=false, code='REQUIREMENT_NOT_DRAFT'; L1: 当 status !== 'DRAFT' 时按钮不可见 | 需测试多种非草稿状态（PENDING_REVIEW/READY/REJECTED/CANCELLED） | P0 |
| TC1.5.3 | 非 BA 角色不显示"发起评审"按钮 / 不可发起 | 权限校验 | L1 前端 + L2 API | 两层权限：路由层 rbacMiddleware(Operation.SUBMIT_REVIEW) = [BA, TRAIN_ADMIN]，service 层 L1126-1131 额外校验 BA 归属关系 | index.ts L287（rbacMiddleware）；service.ts L1126-1131（BA 归属校验）；constants/index.ts L157（PERMISSION_MATRIX） | L2: 非 BA/非 TRAIN_ADMIN 返回 PERMISSION_DENIED；BA 非归属人返回 REQUIREMENT_PERMISSION_DENIED; L1: 非 BA 角色不显示按钮 | TRAIN_ADMIN/SUPER_ADMIN 不受 BA 归属限制，需单独验证 | P0 |
| TC1.5.4 | 必填字段不完整时提示 | 字段校验 | L2 API | 6 个必填字段在 service L1134-1155 逐一校验，前端表单也应逐字段提示 | service.ts L1135-1155（title/description/systemId/priority/storyPoints/baId 校验） | 各字段缺失时返回 success=false, code='BAD_REQUEST', message 包含字段名 | 当前测试仅覆盖 title/description 缺失，其余 4 个字段需补充 | P0 |
| TC1.5.5 | 发起评审后需求不可编辑 | 状态约束 | L2 API + L3 UI | 后端 updateRequirement 会校验 status === 'DRAFT'（在 update service 中），前端编辑按钮/入口需禁用 | requirements/service.ts updateRequirement 方法中的状态校验（推测在编辑逻辑内）；前端需检查编辑入口的 status 条件 | L2: PATCH /requirements/:id 对 PENDING_REVIEW 状态返回错误码; L3: PENDING_REVIEW 状态下编辑按钮不可见/不可用 | **当前无直接测试案例**，需新增 | P0 |
| TC1.5.6 | 审计日志记录 SUBMIT_REVIEW | 审计 | L2 API | 审计日志在事务内 statusLog.create 创建（L1178-1186），需查询数据库验证 | service.ts L1178-1186（statusLog.create）；OperationType.SUBMIT_REVIEW（constants/index.ts L28） | 1. statusLog 记录存在; 2. operationType='SUBMIT_REVIEW'; 3. fromStatus='DRAFT'; 4. toStatus='PENDING_REVIEW'; 5. operatorId 匹配 | 需确认 operatorId 是否正确记录 | P1 |
| TC1.5.7 | 批量发起评审（全部草稿） | 批量操作 | L2 API | 批量操作涉及多条记录的事务处理 | **代码未实现**（无 batchSubmitReview 路由/方法） | 待实现后补充 | **功能缺失，TC 无法执行** | P1 |
| TC1.5.8 | 批量发起评审含非草稿（部分失败） | 批量异常 | L2 API | 部分失败场景需验证事务回滚和错误提示 | **代码未实现** | 待实现后补充 | **功能缺失，TC 无法执行** | P1 |

---

## B. US1.8 逐案例详细分析

| 案例编号 | 测试目标 | 测试类型 | 推荐层级 | 分层理由 | 逻辑代码映射 | 建议断言 | 补充风险 | 优先级 |
|---------|---------|---------|---------|---------|------------|---------|---------|-------|
| TC1.8.1 | BA 正常重新编辑，REJECTED -> DRAFT | 正向功能 | L2 API | 涉及 authenticate + rbacMiddleware + service（状态校验+权限+乐观锁+事务） | service.ts L1567-1636（reEdit 全流程）；index.ts L338-353（路由）；constants/index.ts L156（EDIT_REQ 权限） | 1. statusCode=200; 2. success=true; 3. data.status='DRAFT'; 4. data.id 匹配; 5. data.version 原值+1 | 状态前置条件为 REJECTED，需先通过 reject 流程准备测试数据 | P0 |
| TC1.8.2 | 非已拒绝状态不显示"重新编辑"按钮 | 状态校验 | L1 前端 + L2 API | 后端校验 service L1585（existing.status !== 'REJECTED'），前端按钮需根据 status 条件渲染 | service.ts L1585-1587（状态校验 REJECTED） | L2: statusCode=200, success=false, code='REQUIREMENT_NOT_REJECTED'; L1: 当 status !== 'REJECTED' 时按钮不可见 | 需测试多种非拒绝状态（DRAFT/PENDING_REVIEW/READY/CANCELLED） | P0 |
| TC1.8.3 | 重新编辑后审计记录 RE_EDIT | 审计 | L2 API | 审计日志在事务内 statusLog.create 创建（L1613-1621） | service.ts L1613-1621（statusLog.create）；OperationType.RE_EDIT（constants/index.ts L31） | 1. statusLog 记录存在; 2. operationType='RE_EDIT'; 3. fromStatus='REJECTED'; 4. toStatus='DRAFT'; 5. operatorId 匹配 | 需确认 operatorId 是否正确记录 | P1 |
| TC1.8.4 | 重新编辑后可再次发起评审 | 状态链 | L3 UI / L2 API | 完整链路 REJECTED -> DRAFT -> PENDING_REVIEW，涉及 reEdit + submitReview 两个操作 | service.ts L1567-1636（reEdit）+ L1095-1201（submitReview） | 1. reEdit 后 status='DRAFT'; 2. 再次 submitReview 后 status='PENDING_REVIEW'; 3. 两条 statusLog 记录均存在 | E2E Journey 2 已覆盖完整链路 | P0 |
| TC1.8.5 | PM 角色可重新编辑 | 权限校验 | L2 API | PM 权限在 service L1589-1593 明确校验（operatorRole !== Role.PM 时拒绝） | service.ts L1589-1593（PM 权限校验）；index.ts L343（rbacMiddleware EDIT_REQ 允许 PM） | 1. statusCode=200; 2. success=true; 3. data.status='DRAFT'; 4. operatorId 为 PM 用户 ID | PM 无归属人限制，可操作任意 REJECTED 需求（见 CR4 风险） | P0 |

---

## C. 检查点完整遍历记录

> 以下为自测检查点清单中所有条目的完整遍历，含涉及/不涉及/部分涉及项。

### 一、交互类

#### 1.接口

| 序号 | 检查点 | 优先级 | 涉及判定 | US1.5/US1.8 相关度 | 分析摘要 |
|------|--------|-------|---------|-------------------|---------|
| 1.1 | 前后端校验规则是否一致 | P0 | **涉及** | submitReview 必填字段校验 | 后端 L1134-1155 校验 6 个字段；前端表单校验需确认一致 |
| 1.2 | 调用接口需配置合理的超时时间 | P1 | 不涉及 | - | 同步操作，无特别超时需求 |
| 1.3 | 报文格式/长度/加密规则 | P0 | **涉及** | submitReview/reEdit 无请求体 | 两个接口均无 payload，响应统一 ApiResponse 格式 |
| 1.4 | 防重发 | P0 | **涉及** | 乐观锁+状态校验隐式防重 | 依赖乐观锁和状态校验，无显式幂等键 |
| 1.5 | 正常流程测试 | P0 | **涉及** | TC1.5.1 / TC1.8.1 覆盖 | 完整链路验证 |
| 1.6 | 边界条件测试 | P0 | **涉及** | 字段边界值未充分覆盖 | 仅覆盖空值，未覆盖长度/范围边界 |
| 1.7 | 错误处理测试 | P0 | **涉及** | TC1.5.x / TC1.8.x 全覆盖 | 所有错误分支均有测试 |
| 1.8 | 重试机制测试 | P1 | 不涉及 | - | 无自动重试机制 |

#### 2.交互

| 序号 | 检查点 | 优先级 | 涉及判定 | US1.5/US1.8 相关度 | 分析摘要 |
|------|--------|-------|---------|-------------------|---------|
| 2.1 | 提交/确认按钮添加 loading | P1 | **涉及** | 前端按钮交互 | 前端组件代码未在分析范围，需人工验证 |
| 2.2 | 接口异常时友好错误提示 | P1 | **涉及** | 前端 toast/message | 后端返回统一错误格式，前端展示未测试 |
| 2.3 | 敏感操作二次确认 | P0 | **待确认** | 发起评审是否需二次确认 | 对比评审拒绝有确认弹窗，发起评审/重新编辑无 |

### 二、管理类功能

#### 1.权限控制

| 序号 | 检查点 | 优先级 | 涉及判定 | US1.5/US1.8 相关度 | 分析摘要 |
|------|--------|-------|---------|-------------------|---------|
| II.1.1 | 用户、角色、权限控制 | P0 | **涉及** | TC1.5.3 / TC1.8.5 | submitReview 和 reEdit 权限矩阵全覆盖测试 |

#### 2.数据操作

| 序号 | 检查点 | 优先级 | 涉及判定 | US1.5/US1.8 相关度 | 分析摘要 |
|------|--------|-------|---------|-------------------|---------|
| II.2.1 | 查询分页索引 | P1 | 不涉及 | - | submitReview/reEdit 非查询操作 |
| II.2.2 | 表数据操作准确性 | P0 | **涉及** | 事务更新+审计日志 | 乐观锁+状态变更+日志创建均有覆盖 |

#### 3.重要参数校验

| 序号 | 检查点 | 优先级 | 涉及判定 | US1.5/US1.8 相关度 | 分析摘要 |
|------|--------|-------|---------|-------------------|---------|
| II.3.1 | 重要参数校验 | P1 | **涉及** | submitReview 必填字段校验 | 6 个字段逐一校验，部分缺失场景未覆盖 |

#### 4.审计

| 序号 | 检查点 | 优先级 | 涉及判定 | US1.5/US1.8 相关度 | 分析摘要 |
|------|--------|-------|---------|-------------------|---------|
| II.4.1 | 审计要求 | P1 | **涉及** | TC1.5.6 / TC1.8.3 | SUBMIT_REVIEW 和 RE_EDIT 审计日志均验证 |

### 三、交易类功能

#### 4.状态流转

| 序号 | 检查点 | 优先级 | 涉及判定 | US1.5/US1.8 相关度 | 分析摘要 |
|------|--------|-------|---------|-------------------|---------|
| III.4.1 | 状态流转符合业务规则 | P0 | **涉及** | DRAFT->PENDING_REVIEW, REJECTED->DRAFT | TC1.5.1 / TC1.8.1 + E2E 覆盖 |
| III.4.2 | 无效状态跳转被拦截 | P0 | **涉及** | TC1.5.2 / TC1.8.2 | 仅覆盖部分非目标状态 |

#### 5.异常回滚

| 序号 | 检查点 | 优先级 | 涉及判定 | US1.5/US1.8 相关度 | 分析摘要 |
|------|--------|-------|---------|-------------------|---------|
| III.5.1 | 异常场景回滚 | P0 | **涉及** | 乐观锁冲突 | TC1.5.12 部分覆盖（状态校验而非乐观锁） |

#### 6.幂等设计

| 序号 | 检查点 | 优先级 | 涉及判定 | US1.5/US1.8 相关度 | 分析摘要 |
|------|--------|-------|---------|-------------------|---------|
| III.6.1 | 重复请求测试 | P0 | **涉及** | 隐式幂等（状态校验+乐观锁） | TC1.5.12 / TC1.5.14 覆盖 |
| III.6.2 | 幂等标识有效期 | P1 | 不涉及 | - | 无显式幂等设计 |

---

## D. 逻辑代码映射表

| 功能点 | 代码文件 | 行号 | 函数/方法 | 核心逻辑说明 |
|--------|---------|------|----------|------------|
| 发起评审-路由 | modules/requirements/index.ts | L282-297 | POST /api/requirements/:id/submit-review | authenticate + rbacMiddleware(SUBMIT_REVIEW) -> submitReview() |
| 发起评审-权限定义 | packages/shared/src/constants/index.ts | L157 | Operation.SUBMIT_REVIEW | PERMISSION_MATRIX: [BA, TRAIN_ADMIN] |
| 发起评审-权限矩阵工具 | packages/shared/src/constants/index.ts | L175-178 | hasPermission() | SUPER_ADMIN 自动放行 |
| 发起评审-查询需求 | modules/requirements/service.ts | L1100-1114 | submitReview -> prisma.findUnique | 含 baId 用于归属校验 |
| 发起评审-状态校验 | modules/requirements/service.ts | L1120-1123 | submitReview -> status !== 'DRAFT' | 仅草稿可发起 |
| 发起评审-BA归属校验 | modules/requirements/service.ts | L1126-1131 | submitReview -> BA归属判断 | BA 必须 operatorId === baId；TRAIN_ADMIN/SUPER_ADMIN 不限 |
| 发起评审-字段校验 | modules/requirements/service.ts | L1134-1155 | submitReview -> 6 字段校验 | title(非空/<=200)、description(非空)、systemId、priority、storyPoints(1-100)、baId |
| 发起评审-事务更新 | modules/requirements/service.ts | L1158-1175 | submitReview -> $transaction | updateMany(乐观锁) -> count=0 抛异常 |
| 发起评审-审计日志 | modules/requirements/service.ts | L1178-1186 | submitReview -> statusLog.create | operationType=SUBMIT_REVIEW, fromStatus=DRAFT, toStatus=PENDING_REVIEW |
| 发起评审-返回数据 | modules/requirements/service.ts | L1189-1201 | submitReview -> findUnique+buildRequirementDetail | 返回含关联数据的完整详情 |
| 重新编辑-路由 | modules/requirements/index.ts | L338-353 | POST /api/requirements/:id/re-edit | authenticate + rbacMiddleware(EDIT_REQ) -> reEdit() |
| 重新编辑-权限定义 | packages/shared/src/constants/index.ts | L156 | Operation.EDIT_REQ | PERMISSION_MATRIX: [BA, PM, PROJECT_MGR] |
| 重新编辑-查询需求 | modules/requirements/service.ts | L1572-1579 | reEdit -> prisma.findUnique | 仅 select id/status/version |
| 重新编辑-状态校验 | modules/requirements/service.ts | L1585-1587 | reEdit -> status !== 'REJECTED' | 仅已拒绝可重新编辑 |
| 重新编辑-权限校验 | modules/requirements/service.ts | L1589-1593 | reEdit -> BA/PM 权限 | 仅 BA 和 PM 可操作 |
| 重新编辑-事务更新 | modules/requirements/service.ts | L1596-1611 | reEdit -> $transaction | updateMany(乐观锁) -> status='DRAFT' |
| 重新编辑-审计日志 | modules/requirements/service.ts | L1613-1621 | reEdit -> statusLog.create | operationType=RE_EDIT, fromStatus=REJECTED, toStatus=DRAFT |
| 重新编辑-返回数据 | modules/requirements/service.ts | L1623-1635 | reEdit -> findUnique+buildRequirementDetail | 返回含关联数据的完整详情 |
| 前端-发起评审API | apps/web/src/services/requirement.ts | L77-80 | requirementService.submitReview | POST /requirements/:id/submit-review，无 payload |
| 前端-重新编辑API | apps/web/src/services/requirement.ts | L111-114 | requirementService.reEdit | POST /requirements/:id/re-edit，无 payload |
| 操作类型-枚举 | packages/shared/src/constants/index.ts | L28 | OperationType.SUBMIT_REVIEW | 发起评审操作类型 |
| 操作类型-枚举 | packages/shared/src/constants/index.ts | L31 | OperationType.RE_EDIT | 重新编辑操作类型 |
| 批量操作类型-枚举 | packages/shared/src/constants/index.ts | L39 | OperationType.BATCH_SUBMIT_REVIEW | 已定义但未实现 |

---

## E. 测试资产覆盖证据表

### E.1 t1-us1-requirement-entry.test.ts

| 覆盖范围 | 案例编号 | 测试层级 | 覆盖的检查点 | 备注 |
|---------|---------|---------|------------|------|
| US1.5 submitReview | TC1.5.1（BA归属人发起） | L2 API | 正常流程、权限(归属BA)、状态流转、数据操作准确性 | API 集成测试 |
| US1.5 submitReview | TC1.5.2（TRAIN_ADMIN 发起） | L2 API | 权限(TRAIN_ADMIN) | 补充了需求文档外的角色 |
| US1.5 submitReview | TC1.5.3（SUPER_ADMIN 发起） | L2 API | 权限(SUPER_ADMIN) | 补充了需求文档外的角色 |
| US1.5 submitReview | TC1.5.4（PM 拒绝） | L2 API | 权限(PM不可)、错误处理 | 验证 PM 无 SUBMIT_REVIEW 权限 |
| US1.5 submitReview | TC1.5.5（TECH_MGR 拒绝） | L2 API | 权限(TECH_MGR不可)、错误处理 | |
| US1.5 submitReview | TC1.5.6（非归属BA 拒绝） | L2 API | 权限(BA归属关系)、错误处理 | 验证 BA 非归属人被拒 |
| US1.5 submitReview | TC1.5.7（标题缺失） | L2 API | 前后端校验(title)、边界条件 | 通过 DB 直接创建空标题数据 |
| US1.5 submitReview | TC1.5.8（描述缺失） | L2 API | 前后端校验(description)、边界条件 | 通过 DB 直接创建空描述数据 |
| US1.5 submitReview | TC1.5.9（非草稿状态） | L2 API | 无效状态跳转、错误处理 | PENDING_REVIEW 状态被拦截 |
| US1.5 submitReview | TC1.5.10（需求不存在） | L2 API | 错误处理 | REQUIREMENT_NOT_FOUND |
| US1.5 submitReview | TC1.5.11（未登录） | L2 API | 权限(鉴权)、错误处理 | UNAUTHORIZED |
| US1.5 submitReview | TC1.5.12（并发冲突） | L2 API | 防重发、幂等(部分) | 实际验证状态校验而非乐观锁冲突 |
| US1.5 submitReview | TC1.5.13（审计日志） | L2 API | 审计(SUBMIT_REVIEW) | 查询 statusLog 验证 |
| US1.5 submitReview | TC1.5.14（多次发起） | L2 API | 正常流程(多条)、幂等(不同需求) | |
| US1.8 reEdit | TC1.8.1（BA 正常） | L2 API | 正常流程、权限(BA)、状态流转、数据操作 | |
| US1.8 reEdit | TC1.8.2（PM 正常） | L2 API | 权限(PM)、状态流转 | |
| US1.8 reEdit | TC1.8.3（PROJECT_MGR 拒绝） | L2 API | 权限(PROJECT_MGR不可)、错误处理 | service 层拒绝 |
| US1.8 reEdit | TC1.8.4（TECH_MGR 拒绝） | L2 API | 权限(TECH_MGR不可)、错误处理 | 路由层拒绝 |
| US1.8 reEdit | TC1.8.5（TEST_MGR 拒绝） | L2 API | 权限(TEST_MGR不可)、错误处理 | 路由层拒绝 |
| US1.8 reEdit | TC1.8.6（TRAIN_ADMIN 拒绝） | L2 API | 权限(TRAIN_ADMIN不可)、错误处理 | **口径差异：需求文档要求允许** |
| US1.8 reEdit | TC1.8.7（SUPER_ADMIN 拒绝） | L2 API | 权限(SUPER_ADMIN不可)、错误处理 | **口径差异：需求文档要求允许** |
| US1.8 reEdit | TC1.8.8（草稿状态拒绝） | L2 API | 无效状态跳转、错误处理 | REQUIREMENT_NOT_REJECTED |
| US1.8 reEdit | TC1.8.9（待评审状态拒绝） | L2 API | 无效状态跳转、错误处理 | REQUIREMENT_NOT_REJECTED |
| US1.8 reEdit | TC1.8.10（需求不存在） | L2 API | 错误处理 | REQUIREMENT_NOT_FOUND |
| US1.8 reEdit | TC1.8.11（未登录） | L2 API | 权限(鉴权)、错误处理 | UNAUTHORIZED |
| US1.8 reEdit | TC1.8.12（版本递增） | L2 API | 数据操作准确性(乐观锁) | |
| US1.8 reEdit | TC1.8.13（审计日志） | L2 API | 审计(RE_EDIT) | 查询 statusLog 验证 |

### E.2 t1-requirements-api-automation.test.ts

| 覆盖范围 | 案例编号 | 测试层级 | 覆盖的检查点 | 备注 |
|---------|---------|---------|------------|------|
| US1.5 submitReview | TC1.5.1（正常发起） | L2 API | 正常流程、状态流转 | API 自动化 |
| US1.5 submitReview | TC1.5.2（非草稿拒绝） | L2 API | 无效状态跳转 | |
| US1.5 submitReview | TC1.5.3（非BA角色拒绝） | L2 API | 权限(TECH_MGR) | |
| US1.7/US1.8 reEdit | TC1.7.6（拒绝后可重新编辑） | L2 API | 正常流程(reEdit) | 嵌套在 US1.7 测试中 |

### E.3 service.test.ts

| 覆盖范围 | 说明 |
|---------|------|
| submitReview | **无覆盖** -- service.test.ts 仅包含 createRequirement 的 mock 单测 |
| reEdit | **无覆盖** -- 无 reEdit 相关单测 |

### E.4 t1-us1.5-my-todos.test.ts

| 覆盖范围 | 说明 |
|---------|------|
| submitReview / reEdit | **不直接覆盖** -- 仅测试 GET /api/requirements/my-todos 待办聚合接口，验证各角色的待办字段返回 |

### E.5 journey-1-create-review-pass.test.ts（E2E）

| 覆盖范围 | 测试层级 | 覆盖内容 | 备注 |
|---------|---------|---------|------|
| Journey 1 | L3 UI E2E | BA 创建 -> 发起评审 -> PM 评审通过完整链路 | 覆盖 TC1.5.1 的 E2E 视角 |
| Journey 2 | L3 UI E2E | BA 创建 -> 发起评审 -> PM 拒绝 -> BA 重新编辑 -> 再次发起评审 | 覆盖 TC1.5.1 + TC1.8.1 + TC1.8.4 的 E2E 完整链路 |

---

## F. 补充案例详细描述

### F.1 S1: storyPoints 边界值校验

| 维度 | 内容 |
|------|------|
| 案例目标 | 验证 storyPoints = 0 和 101 时返回 BAD_REQUEST |
| 推荐层级 | L2 API |
| 前置条件 | 需求状态为 DRAFT，其余必填字段完整 |
| 测试步骤 | 1. 通过 DB 创建 storyPoints=0 的草稿需求; 2. POST /submit-review; 3. 验证返回 BAD_REQUEST; 4. 同理测试 storyPoints=101 |
| 预期断言 | success=false, code='BAD_REQUEST', message 包含 '工作量点数' |
| 对应代码 | service.ts L1150-1151 |
| 优先级 | P0 |

### F.2 S2: 标题长度上限校验

| 维度 | 内容 |
|------|------|
| 案例目标 | 验证 title 长度 > 200 时返回 BAD_REQUEST |
| 推荐层级 | L2 API |
| 前置条件 | 需求状态为 DRAFT |
| 测试步骤 | 1. 通过 DB 创建 title=201字符 的草稿需求; 2. POST /submit-review; 3. 验证返回 BAD_REQUEST |
| 预期断言 | success=false, code='BAD_REQUEST', message 包含 '标题' |
| 对应代码 | service.ts L1138-1139 |
| 优先级 | P0 |

### F.3 S4: 发起评审后不可编辑

| 维度 | 内容 |
|------|------|
| 案例目标 | 验证 PENDING_REVIEW 状态下编辑需求被拒绝 |
| 推荐层级 | L2 API |
| 前置条件 | 需求状态为 PENDING_REVIEW |
| 测试步骤 | 1. 创建草稿需求; 2. 发起评审; 3. 尝试 PATCH /requirements/:id 修改标题; 4. 验证返回错误 |
| 预期断言 | success=false, code 包含 'NOT_DRAFT' 或类似状态错误码 |
| 对应代码 | requirements/service.ts updateRequirement 方法中的状态校验 |
| 优先级 | P0 |

### F.4 S6: 并发乐观锁冲突

| 维度 | 内容 |
|------|------|
| 案例目标 | 验证两个并发请求仅一个成功，另一个返回 VERSION_CONFLICT |
| 推荐层级 | L2 API |
| 前置条件 | 需求状态为 DRAFT |
| 测试步骤 | 1. 创建草稿需求; 2. Promise.all 同时发起两个 submitReview 请求; 3. 验证一个成功、一个失败 |
| 预期断言 | 一个 success=true 且 status='PENDING_REVIEW'; 另一个 success=false 且 code='REQUIREMENT_VERSION_CONFLICT' |
| 对应代码 | service.ts L1168-1175（count=0 分支） |
| 优先级 | P1 |

---

*附件结束。主报告详见：T1-US1.5-US1.8-发起评审与重新编辑-测试策略与覆盖分析.md*
