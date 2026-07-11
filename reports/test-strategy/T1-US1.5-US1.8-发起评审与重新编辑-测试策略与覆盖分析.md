# T1-US1.5 / US1.8 发起评审与重新编辑 -- 测试策略与覆盖分析

> 版本：v1.0 | 日期：2026-07-11 | 提交范围：9a6d9266（US1.5）、a40674ee（US1.8）

---

## 一、分析范围

| 维度 | 说明 |
|------|------|
| **模块名** | T1-需求池管理 |
| **聚焦用户故事** | US1.5 发起评审（DRAFT -> PENDING_REVIEW）、US1.8 重新编辑（REJECTED -> DRAFT） |
| **测试案例来源** | US1.5 案例表（TC1.5.1 ~ TC1.5.8，共 8 个）、US1.8 案例表（TC1.8.1 ~ TC1.8.5，共 5 个） |
| **需求/设计来源** | BR1.5.1 ~ BR1.5.6（发起评审规则）、BR1.8.1 ~ BR1.8.5（重新编辑规则） |
| **代码范围** | `modules/requirements/service.ts`（submitReview L1095-1201、reEdit L1567-1636）、`modules/requirements/index.ts`（路由定义 L282-353）、`packages/shared/src/constants/index.ts`（权限矩阵/枚举）、`apps/web/src/services/requirement.ts`（前端 API 层） |
| **提交范围** | 9a6d9266（US1.5 发起评审）、a40674ee（US1.8 重新编辑） |
| **测试资产** | t1-us1-requirement-entry.test.ts、t1-requirements-api-automation.test.ts、service.test.ts（无 submitReview/reEdit 单测）、t1-us1.5-my-todos.test.ts（待办聚合）、journey-1-create-review-pass.test.ts（E2E） |

---

## 二、飞书来源记录表

| 信息项 | 飞书来源 |
|--------|---------|
| US1.5 / US1.8 需求规则 | 飞书需求文档 BR1.5.x / BR1.8.x |
| TC1.5.x / TC1.8.x 测试案例 | 飞书测试案例表 |
| 自测检查点清单 | 飞书自测检查点模板 |
| 批量发起评审需求 | 飞书需求补充（TC1.5.7 / TC1.5.8） |

> 注：本次分析中飞书文档的具体 URL 未直接引用，以需求文档编号和案例编号为准。

---

## 三、口径差异

| 差异项 | 需求文档定义 | 代码实际实现 | 影响评估 | 建议 |
|--------|------------|------------|---------|------|
| **RE_EDIT 权限** | BR1.8.2：BA、PM、TRAIN_ADMIN、SUPER_ADMIN 可重新编辑 | 代码 service.ts L1589-1593 仅允许 BA、PM；路由 index.ts L343 复用 `Operation.EDIT_REQ`（BA/PM/PROJECT_MGR）；PERMISSION_MATRIX 中 EDIT_REQ = [BA, PM, PROJECT_MGR]，无 TRAIN_ADMIN/SUPER_ADMIN | **[高风险]** TRAIN_ADMIN 和 SUPER_ADMIN 在需求文档中应有重新编辑权限，但代码中无此实现。PROJECT_MGR 反而在代码中可操作，但需求文档未列出 | 1. 确认需求文档权限矩阵是否最新；2. 若需求文档为最新，则代码需补充 TRAIN_ADMIN/SUPER_ADMIN 权限，并移除 PROJECT_MGR；3. 若代码为最新，则需更新需求文档 |
| **批量发起评审** | TC1.5.7 / TC1.5.8 覆盖批量发起评审场景 | 代码中无 `batchSubmitReview` 路由和服务方法，OperationType 中定义了 `BATCH_SUBMIT_REVIEW` 但未实现 | **[中风险]** 批量发起评审功能未在 US1.5 提交中实现，TC1.5.7 / TC1.5.8 无法执行 | 确认是否属于后续迭代范围；若是，需在案例表中标注"待实现" |

---

## 四、US1.5 发起评审 -- 逐案例测试分层策略表

| 案例编号 | 测试目标 | 推荐层级 | 分层理由 | 已有测试覆盖 | 覆盖判定 |
|---------|---------|---------|---------|------------|---------|
| TC1.5.1 | BA 归属人正常发起评审，DRAFT -> PENDING_REVIEW | L2 API | 涉及路由+鉴权+状态流转+事务，API 层验证完整链路 | t1-us1-requirement-entry.test.ts TC1.5.1；t1-requirements-api-automation.test.ts TC1.5.1；journey-1 E2E | **已覆盖** |
| TC1.5.2 | 非草稿状态不显示"发起评审"按钮 / 不可发起 | L1 前端 + L2 API | 前端按钮显隐（L1前端）、后端状态校验（L2 API） | t1-us1-requirement-entry.test.ts TC1.5.9；t1-requirements-api-automation.test.ts TC1.5.2 | **部分覆盖**（后端已覆盖，前端按钮显隐未验证） |
| TC1.5.3 | 非 BA 角色不显示"发起评审"按钮 / 不可发起 | L1 前端 + L2 API | 前端权限显隐（L1前端）、后端权限校验（L2 API） | t1-us1-requirement-entry.test.ts TC1.5.4/5/6（PM/TECH_MGR/非归属BA）；t1-requirements-api-automation.test.ts TC1.5.3 | **部分覆盖**（后端已覆盖，前端权限按钮矩阵未验证） |
| TC1.5.4 | 必填字段不完整时提示 | L2 API | 后端字段校验逻辑在 service 层，需通过 API 验证完整链路 | t1-us1-requirement-entry.test.ts TC1.5.7（标题缺失）、TC1.5.8（描述缺失） | **部分覆盖**（仅验证标题/描述缺失，systemId/priority/storyPoints/baId 缺失未单独测试） |
| TC1.5.5 | 发起评审后需求不可编辑 | L2 API + L3 UI | 后端编辑接口会校验状态（L2），前端需验证编辑入口禁用（L3） | 无直接测试案例验证编辑拦截 | **缺失** |
| TC1.5.6 | 审计日志记录 SUBMIT_REVIEW | L2 API | 审计日志写入在事务内，需 API 验证完整性 | t1-us1-requirement-entry.test.ts TC1.5.13 | **已覆盖** |
| TC1.5.7 | 批量发起评审（全部草稿） | L2 API | 批量操作涉及多条记录事务，需 API 验证 | **无**（代码未实现 batchSubmitReview） | **缺失**（待实现） |
| TC1.5.8 | 批量发起评审含非草稿（部分失败） | L2 API | 批量部分失败场景的回滚与错误提示 | **无**（代码未实现） | **缺失**（待实现） |

---

## 五、US1.8 重新编辑 -- 逐案例测试分层策略表

| 案例编号 | 测试目标 | 推荐层级 | 分层理由 | 已有测试覆盖 | 覆盖判定 |
|---------|---------|---------|---------|------------|---------|
| TC1.8.1 | BA 正常重新编辑，REJECTED -> DRAFT | L2 API | 状态流转+权限+事务，API 层验证完整链路 | t1-us1-requirement-entry.test.ts TC1.8.1；t1-requirements-api-automation.test.ts TC1.7.6；journey-1 E2E Journey 2 | **已覆盖** |
| TC1.8.2 | 非已拒绝状态不显示"重新编辑"按钮 | L1 前端 + L2 API | 前端按钮显隐（L1前端）、后端状态校验（L2 API） | t1-us1-requirement-entry.test.ts TC1.8.8（草稿）、TC1.8.9（待评审） | **部分覆盖**（后端已覆盖，前端按钮显隐未验证） |
| TC1.8.3 | 重新编辑后审计记录 RE_EDIT | L2 API | 审计日志写入在事务内 | t1-us1-requirement-entry.test.ts TC1.8.13 | **已覆盖** |
| TC1.8.4 | 重新编辑后可再次发起评审 | L3 UI / L2 API | 完整状态链 REJECTED->DRAFT->PENDING_REVIEW | journey-1 E2E Journey 2（BA 拒绝->重新编辑->发起评审完整链路） | **已覆盖**（E2E 覆盖） |
| TC1.8.5 | PM 角色可重新编辑 | L2 API | PM 权限在 service 层明确校验 | t1-us1-requirement-entry.test.ts TC1.8.2 | **已覆盖** |

---

## 六、自测检查点审查（模块 C）

### 6.1 交互类 / 1.接口

#### [P0] 前后端校验规则是否一致

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 前后端校验规则是否一致 |
| **代码证据** | submitReview 后端 L1134-1155 对 title/description/systemId/priority/storyPoints/baId 进行了完整校验（含空值、长度、范围）；前端 services/requirement.ts L77-80 仅调用 POST 接口无额外校验，表单校验由前端组件执行 |
| **案例覆盖** | TC1.5.4 部分覆盖（仅测试标题/描述缺失） |
| **补充建议** | 1. 补充 systemId/priority/storyPoints/baId 各自缺失时的 L2 测试；2. 确认前端表单校验规则与后端一致（L1 前端单测） |
| **判定** | **部分覆盖** |

#### [P0] 报文格式/长度/加密规则

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 报文格式/长度/加密规则 |
| **代码证据** | submitReview 和 reEdit 均无请求体（POST 仅依赖 URL 参数 id），前端 requirement.ts L77-80、L111-114 确认无 payload；响应统一 ApiResponse\<RequirementDetail\> |
| **案例覆盖** | TC1.5.1 / TC1.8.1 验证了正常响应格式 |
| **补充建议** | 无额外风险，两个接口均无请求体，无需加密/报文长度校验 |
| **判定** | **已覆盖** |

#### [P0] 防重发

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 防重发（防重复提交） |
| **代码证据** | submitReview 和 reEdit 均依赖乐观锁（updateMany where version = existing.version，L1160-1175、L1597-1611），无显式幂等键；第二次提交会被状态校验拦截（非 DRAFT/REJECTED）或乐观锁冲突（count=0） |
| **案例覆盖** | t1-us1-requirement-entry.test.ts TC1.5.12 验证了重复提交场景（第二次因状态校验被拦截）；TC1.5.14 验证了多次发起（不同需求） |
| **补充建议** | 乐观锁+状态校验已提供隐式防重发，可接受。但前端按钮应加 loading 防止用户快速双击（L1 前端） |
| **判定** | **已覆盖**（隐式防重） |

#### [P0] 正常流程测试

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 正常流程测试 |
| **代码证据** | submitReview 完整路径 L1095-1201、reEdit 完整路径 L1567-1636 |
| **案例覆盖** | TC1.5.1、TC1.8.1 均有 API + E2E 覆盖 |
| **判定** | **已覆盖** |

#### [P0] 边界条件测试

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 边界条件测试 |
| **代码证据** | submitReview L1138-1139 标题长度 <=200、L1150-1151 storyPoints 范围 1-100 |
| **案例覆盖** | TC1.5.4 部分覆盖（字段为空），标题长度上限/下限、storyPoints 边界值（0/1/100/101）未覆盖 |
| **补充建议** | 补充 storyPoints = 0、101 边界值 L2 测试；补充 title = 201 字符的 L2 测试 |
| **判定** | **部分覆盖** |

#### [P0] 错误处理测试

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 错误处理测试 |
| **代码证据** | service.ts 中 errors.requirementNotFound() / errors.requirementNotDraft() / errors.requirementPermissionDenied() / errors.badRequest() / errors.requirementVersionConflict() |
| **案例覆盖** | TC1.5.2/3（状态/权限）、TC1.8.2（状态）；t1-us1-requirement-entry.test.ts 覆盖了所有错误分支（TC1.5.7-11、TC1.8.3-11） |
| **判定** | **已覆盖** |

### 6.2 交互类 / 2.交互

#### [P1] 提交/确认按钮添加 loading

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P1 -- 提交/确认按钮添加 loading 状态 |
| **代码证据** | 前端组件层代码未在本次分析范围内（需检查需求详情页的"发起评审"/"重新编辑"按钮） |
| **案例覆盖** | 无测试覆盖 |
| **补充建议** | L3 UI 自动化中验证点击按钮后出现 loading、请求完成后恢复；或 L1 前端单测验证 useState 控制 loading |
| **判定** | **缺失**（L1前端/L3UI） |

#### [P1] 接口异常时友好错误提示

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P1 -- 接口异常时友好错误提示 |
| **代码证据** | 后端返回统一 ApiResponse 格式（success=false + code + message），前端 Axios 拦截器已配置错误处理（requirement.ts L3 注释） |
| **案例覆盖** | 无测试覆盖前端 toast/message 展示 |
| **补充建议** | L3 UI 验证各错误场景（权限不足、字段缺失等）的 UI 提示内容 |
| **判定** | **缺失**（L3UI） |

#### [P0] 敏感操作二次确认

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 敏感操作二次确认 |
| **代码证据** | 发起评审/重新编辑均为 POST 操作且不可逆，但代码中无二次确认弹窗；对比评审拒绝操作（journey-1 L116-123）有拒绝弹窗 |
| **案例覆盖** | 无 |
| **补充建议** | 需产品确认发起评审是否需要二次确认弹窗；若需，则补充 L3 UI 测试 |
| **判定** | **待确认** |

### 6.3 管理类功能 / 1.权限控制

#### [P0] 用户、角色、权限控制

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 用户、角色、权限控制 |
| **代码证据** | submitReview 路由 L287 rbacMiddleware(Operation.SUBMIT_REVIEW) = [BA, TRAIN_ADMIN]；service.ts L1126-1131 额外校验 BA 归属关系；reEdit 路由 L343 rbacMiddleware(Operation.EDIT_REQ) = [BA, PM, PROJECT_MGR]；service.ts L1589-1593 仅允许 BA、PM |
| **案例覆盖** | submitReview: BA/非归属BA/PM/TECH_MGR/TRAIN_ADMIN/SUPER_ADMIN 全覆盖（t1-us1-requirement-entry.test.ts TC1.5.1/2/3/4/5/6）；reEdit: BA/PM/PROJECT_MGR/TECH_MGR/TEST_MGR/TRAIN_ADMIN/SUPER_ADMIN 全覆盖（t1-us1-requirement-entry.test.ts TC1.8.1-7） |
| **补充建议** | 发现口径差异（见第三节），需确认 TRAIN_ADMIN/SUPER_ADMIN 对 reEdit 的权限 |
| **判定** | **已覆盖**（代码实现范围） |

### 6.4 管理类功能 / 2.数据操作

#### [P0] 表数据操作准确性

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 表数据操作准确性 |
| **代码证据** | submitReview L1158-1201 事务内 updateMany + statusLog.create + findUnique；reEdit L1596-1635 同理；均使用乐观锁 version 条件 |
| **案例覆盖** | TC1.5.1 验证状态变更、TC1.5.13 验证审计日志、TC1.8.1 验证状态变更、TC1.8.12 验证版本递增、TC1.8.13 验证审计日志 |
| **判定** | **已覆盖** |

### 6.5 管理类功能 / 4.审计

#### [P1] 审计要求

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P1 -- 审计要求 |
| **代码证据** | submitReview 创建 statusLog（operationType=SUBMIT_REVIEW, fromStatus=DRAFT, toStatus=PENDING_REVIEW）；reEdit 创建 statusLog（operationType=RE_EDIT, fromStatus=REJECTED, toStatus=DRAFT） |
| **案例覆盖** | TC1.5.6 / TC1.5.13、TC1.8.3 / TC1.8.13 均验证审计日志记录完整 |
| **判定** | **已覆盖** |

### 6.6 交易类功能 / 4.状态流转

#### [P0] 状态流转符合业务规则

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 状态流转符合业务规则 |
| **代码证据** | submitReview: DRAFT -> PENDING_REVIEW（L1163）；reEdit: REJECTED -> DRAFT（L1600） |
| **案例覆盖** | TC1.5.1、TC1.8.1、Journey 1/2 E2E 完整链路 |
| **判定** | **已覆盖** |

#### [P0] 无效状态跳转被拦截

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 无效状态跳转被拦截 |
| **代码证据** | submitReview L1121 仅 DRAFT；reEdit L1585 仅 REJECTED |
| **案例覆盖** | t1-us1-requirement-entry.test.ts TC1.5.9（PENDING_REVIEW 发起评审）、TC1.8.8（DRAFT 重新编辑）、TC1.8.9（PENDING_REVIEW 重新编辑） |
| **补充建议** | 补充 READY/ONBOARDED/RELEASED/CANCELLED 等状态尝试发起评审/重新编辑的 L2 测试 |
| **判定** | **部分覆盖** |

### 6.7 交易类功能 / 5.异常回滚

#### [P0] 异常场景回滚

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 异常场景回滚 |
| **代码证据** | submitReview L1168-1175 updateMany count=0 时抛出 requirementVersionConflict；reEdit L1605-1611 同理；Prisma $transaction 默认回滚策略 |
| **案例覆盖** | t1-us1-requirement-entry.test.ts TC1.5.12 验证并发冲突场景（部分：第二次因状态非 DRAFT 被拦截而非乐观锁冲突） |
| **补充建议** | 补充真正的并发乐观锁冲突测试（使用 Promise.all 同时发起两个请求） |
| **判定** | **部分覆盖** |

### 6.8 交易类功能 / 6.幂等设计

#### [P0] 重复请求测试

| 维度 | 分析 |
|------|------|
| **涉及项原文** | P0 -- 重复请求测试 |
| **代码证据** | submitReview/reEdit 无显式幂等标识，但乐观锁+状态校验可防并发重复 |
| **案例覆盖** | TC1.5.14 验证了多次发起评审（不同需求每次成功）；TC1.5.12 验证重复提交同一需求被拦截 |
| **补充建议** | 无显式幂等键是可接受的（状态流转是单向操作），但建议前端加 loading 防双击 |
| **判定** | **已覆盖** |

### 6.9 不涉及检查点速查

| 检查点 | 优先级 | 涉及判定 | 原因 |
|--------|-------|---------|------|
| 调用接口需配置合理的超时时间 | P1 | 不涉及 | submitReview/reEdit 为同步操作，无特别超时需求 |
| 重试机制测试 | P1 | 不涉及 | 无自动重试机制 |
| 查询分页索引 | P1 | 不涉及 | submitReview/reEdit 非查询操作 |
| 服务中断恢复 | P2 | 不涉及 | 无长时间运行事务 |
| 幂等标识有效期 | P1 | 不涉及 | 无显式幂等设计 |

---

## 七、覆盖结论汇总

### 7.1 按案例覆盖度

| 覆盖状态 | 数量 | 案例列表 |
|---------|------|---------|
| **已覆盖** | 7 | TC1.5.1、TC1.5.6、TC1.8.1、TC1.8.3、TC1.8.4、TC1.8.5、（TC1.5.2/3 后端部分） |
| **部分覆盖** | 4 | TC1.5.2（缺前端）、TC1.5.3（缺前端）、TC1.5.4（缺字段边界）、TC1.8.2（缺前端） |
| **缺失** | 2 | TC1.5.5（发起评审后不可编辑）、TC1.5.7/TC1.5.8（批量发起评审，代码未实现） |

### 7.2 按检查点覆盖度

| 覆盖状态 | 数量 | 检查点 |
|---------|------|--------|
| **已覆盖** | 9 | 前后端校验(P0-部分)、报文格式(P0)、防重发(P0)、正常流程(P0)、错误处理(P0)、权限控制(P0)、数据操作准确性(P0)、审计(P1)、状态流转(P0)、幂等(P0) |
| **部分覆盖** | 3 | 前后端校验(P0-缺字段边界)、边界条件(P0-缺范围值)、无效状态跳转(P0-缺部分状态) |
| **缺失** | 2 | 按钮 loading(P1)、错误提示 UI(P1) |
| **待确认** | 1 | 二次确认弹窗(P0) |

---

## 八、补充案例建议汇总

| 编号 | 建议案例 | 推荐层级 | 优先级 | 对应检查点 |
|------|---------|---------|-------|-----------|
| S1 | storyPoints = 0 和 101 边界值校验 | L2 API | P0 | 边界条件测试 |
| S2 | title 长度 = 201 字符校验 | L2 API | P0 | 边界条件测试 |
| S3 | systemId/priority/baId 各自缺失时的校验 | L2 API | P1 | 前后端校验一致性 |
| S4 | 发起评审后尝试编辑需求（PATCH /requirements/:id）被拦截 | L2 API | P0 | TC1.5.5 补充 |
| S5 | READY/ONBOARDED/CANCELLED 状态尝试发起评审/重新编辑 | L2 API | P1 | 无效状态跳转 |
| S6 | 并发乐观锁冲突（Promise.all 同时请求） | L2 API | P1 | 异常回滚 |
| S7 | 前端"发起评审"按钮权限矩阵显隐验证 | L1 前端 / L3 UI | P1 | 按钮显隐 |
| S8 | 前端"重新编辑"按钮权限矩阵显隐验证 | L1 前端 / L3 UI | P1 | 按钮显隐 |
| S9 | 点击发起评审/重新编辑后按钮 loading 状态 | L3 UI | P1 | 按钮 loading |
| S10 | 各错误场景前端友好提示（toast/message） | L3 UI | P1 | 错误提示 |
| S11 | 发起评审是否需要二次确认弹窗（需产品确认） | L3 UI / M 人工 | P0 | 二次确认 |

---

## 九、风险与 TODO

| 编号 | 风险/TODO | 优先级 | 影响范围 | 行动项 |
|------|----------|-------|---------|--------|
| R1 | **RE_EDIT 权限口径差异** | **P0 高** | US1.8 | 需确认：代码仅允许 BA/PM，需求文档要求 BA/PM/TRAIN_ADMIN/SUPER_ADMIN。当前代码 PROJECT_MGR 可通过 EDIT_REQ 操作 reEdit 但需求未列出。需与产品/设计对齐后修复代码或更新文档 |
| R2 | **批量发起评审未实现** | **P1 中** | US1.5 TC1.5.7/TC1.5.8 | 确认是否属于后续迭代；若是，在案例表标注"待实现"，当前版本不阻塞发布 |
| R3 | **TC1.5.5 缺失** | **P0 高** | US1.5 | 发起评审后需求不可编辑的测试案例需补充（L2 API 验证 PATCH 接口对 PENDING_REVIEW 状态的拒绝） |
| R4 | **service.test.ts 无 submitReview/reEdit 单测** | **P1 中** | 单测覆盖率 | 当前 service.test.ts 仅覆盖 createRequirement，submitReview/reEdit 的 mock 单测缺失 |
| R5 | **乐观锁并发测试不充分** | **P1 中** | US1.5/US1.8 | 当前 TC1.5.12 实际验证的是状态校验而非乐观锁冲突，需补充真正的并发请求测试 |
| R6 | **前端交互测试缺失** | **P1 中** | UI 层 | 按钮 loading、错误提示、权限矩阵显隐均无自动化测试覆盖 |

---

## 十、代码发现的补充风险

| 编号 | 发现 | 位置 | 风险级别 | 建议 |
|------|------|------|---------|------|
| CR1 | submitReview 中 BA 归属校验使用 operatorId === existing.baId，但 TRAIN_ADMIN/SUPER_ADMIN 不受限制（L1126-1131）；与需求文档 "仅业务归属人（BA）或火车管理员" 一致 | service.ts L1126-1131 | 低 | 正确实现，无需修改 |
| CR2 | reEdit 中 service 层仅校验 BA/PM（L1589-1593），但路由层 rbacMiddleware(EDIT_REQ) 允许 PROJECT_MGR；PROJECT_MGR 可通过路由层鉴权到达 service 层后被 service 层拒绝 | service.ts L1589-1593 + index.ts L343 | **中** | 路由层和 service 层权限不一致可能导致混淆；建议统一或注释说明 |
| CR3 | submitReview 中 fromStatus 取自 existing.status（查询时快照），而非事务内最新数据（L1182） | service.ts L1178-1186 | 低 | 由于事务内已有乐观锁保证 version 未变，fromStatus 使用快照值是安全的 |
| CR4 | reEdit 不校验 baId 归属关系（与 submitReview 不同），PM 可以重新编辑任意 REJECTED 需求 | service.ts L1589-1593 | **中** | 需确认：PM 是否应限于"自己负责的"需求？当前实现允许 PM 重新编辑任意 REJECTED 需求 |
| CR5 | 前端 requirement.ts submitReview/reEdit 无参数防篡改（id 从 URL 参数传入），但后端有完整的身份鉴权+权限校验 | requirement.ts L77-80、L111-114 | 低 | 后端校验充分，无额外风险 |
| CR6 | 无显式防重发机制（无幂等键/Token），依赖乐观锁+状态校验隐式防重 | service.ts L1158-1175、L1596-1611 | 低 | 状态流转是单向的，重复请求会被状态校验拦截，可接受 |

---

*报告结束。附录详见：appendix-T1-US1.5-US1.8-发起评审与重新编辑-测试案例测试方式对照表.md*
