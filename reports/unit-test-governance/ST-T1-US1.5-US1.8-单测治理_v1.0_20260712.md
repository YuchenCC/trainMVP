# T1-US1.5-US1.8 单测治理报告

## 1. 单测门禁摘要

| 项目 | 结果 |
|---|---|
| 报告阶段 | 最终版 |
| 变更范围 | T1 需求池管理：US1.5 发起评审、US1.8 重新编辑；代码范围来自 `reports/test-strategy/ST-T1-US1.5-US1.8-测试策略_v1_20260712.md`，对应 commit `9a6d9266`、`a40674ee` 的最终净差异 |
| 已检查变更文件数 | 5 个：3 个逻辑代码文件、1 个 API 测试资产、1 个设计文档；单测门禁仅计算逻辑代码 |
| 必须覆盖项 | 3 个逻辑代码文件中的 `submitReview`、`reEdit` 及其状态、权限、校验、版本冲突、审计分支；批量案例因未发现实现，单列风险 |
| 排除项 | `packages/shared/src/constants/index.ts` 中纯常量变更；需求/设计文档；路由包装层不作为 L1 单测目标，转 API 证据 |
| 已执行单测数 | 17 |
| 通过数 | 17 |
| 失败数 | 0 |
| 单测通过率 | 100%（17/17） |
| 增量覆盖率 | 未取得变更行增量覆盖率；本地 `service.ts` 文件级覆盖率 33.77%，不能替代增量门禁 |
| 覆盖率来源 | 本地 Vitest/V8 结果；流水线覆盖率数据未取得，待流水线复核 |
| 覆盖率门禁 | 阻塞：缺少本轮变更行增量覆盖率，且仍有未覆盖的 L1 分支 |
| 最终结论 | 阻塞 |

## 2. 已有测试证据

| 测试文件 | 测试层级 | 匹配信号 | 覆盖内容 | 断言质量 | 是否计入单测门禁 |
|---|---|---|---|---|---|
| `release-train/apps/server/src/modules/requirements/service.test.ts:94-226` | L1 后端单测 | 同模块 `requirements/service.ts`；直接调用内部测试导出并隔离 Prisma mock；文件名未匹配配置的 `**/*.unit.test.ts`，但测试边界实际为单元测试 | `generateReqCode`、创建重试和唯一键冲突 | 有效断言：编号结果、重试次数、冲突错误码和创建结果 | 是 |
| `release-train/apps/server/src/modules/requirements/submit-review.unit.test.ts` | L1 后端单测 | 直接调用 `submitReview`，Prisma transaction 与查询均 mock | 正常流转、非草稿、BA 越权、标题缺失、version 冲突和审计对象 | 有效断言：状态、version、错误码/消息、更新条件和审计字段 | 是 |
| `release-train/apps/server/src/modules/requirements/re-edit.unit.test.ts` | L1 后端单测 | 直接调用 `reEdit`，Prisma transaction 与查询均 mock | 正常流转、非法状态、非法角色、version 冲突和审计对象 | 有效断言：状态、version、错误码、更新条件和审计字段 | 是 |
| `release-train/apps/server/src/__tests__/t1-us1-requirement-entry.test.ts` | L2 API/集成 | `app.inject`、需求接口和 US1.5/US1.8 标题 | 覆盖部分状态、角色、字段、版本和审计接口场景 | 业务响应和数据结果断言较完整；不能抵扣 L1 门禁 | 否 |
| `release-train/apps/web/tests/e2e/journey-1-create-review-pass.test.ts` | L3 Playwright | 浏览器页面、按钮和用户旅程 | 覆盖拒绝后重新编辑、进入编辑页并再次提交的 UI 链路 | 有页面状态/URL 断言；不能抵扣 L1 门禁 | 否 |

## 3. L1 策略案例覆盖检查

仅检查主策略报告中“推荐层级”包含 `L1 后端单测` 的案例；已有 API 或 UI 资产不改变 L1 策略筛选结果。

| 覆盖重点 | 策略建议 | 现有覆盖 | 缺口 | 检查结论 |
|---|---|---|---|---|
| TC1.5.1 正常发起评审 | L1 验证 DRAFT、权限、字段、状态、version 和审计；L2 补 API | 新增 L1 成功测试；L2 API/L3 UI 有旁证 | 事务真实落库仍需 L2/集成复核 | 已覆盖 |
| TC1.5.2 非草稿状态不显示按钮 | L1 验证非 DRAFT 门禁；L2/L3 验证接口和按钮 | 新增 L1 非草稿拒绝；L2 有状态拒绝 | UI 显隐属于 L3，未纳入 L1 门禁 | 已覆盖 |
| TC1.5.3 非 BA 角色不显示按钮 | L1 验证角色和 BA 归属判断；L2/L3 补鉴权和显隐 | 新增 L1 非归属 BA 拒绝；L2 有角色/归属旁证 | 缺 TRAIN_ADMIN/SUPER_ADMIN 完整矩阵；UI 显隐属于 L3 | 部分覆盖 |
| TC1.5.4 必填字段不完整提示 | L1 验证字段分支和边界；L2/L3 补错误响应和页面提示 | 新增 L1 标题缺失；L2 有部分字段错误旁证 | 缺 systemId、priority、storyPoints、BA 及标题边界单测 | 部分覆盖 |
| TC1.5.5 发起评审后不可编辑 | L1 验证状态闭环；L2 验证编辑接口门禁；L3 验证操作区 | 未发现直接相关 L1/L2 资产 | 缺 `PENDING_REVIEW` 后不可编辑的单测 | 未覆盖 |
| TC1.5.6 审计日志记录 | L1 验证审计对象和事务副作用；L2 补落库查询 | 新增 L1 审计对象断言；L2 有审计旁证 | 事务失败回滚和真实落库仍缺证据 | 部分覆盖 |
| TC1.5.7 批量发起评审 | 先确认批量实现，再补 L1/L2/L3 | 未发现批量 service、route 或单测 | 缺实现、部分失败策略和单测 | 未覆盖 |
| TC1.5.8 批量发起评审含非草稿 | L1 验证批量状态门禁和失败策略；L2 补响应契约 | 未发现实现或测试资产 | 缺实现、失败隔离/回滚策略和单测 | 未覆盖 |
| TC1.8.1 正常重新编辑 | L1 验证 REJECTED、权限、状态、version 和审计；L2/L3 补接口和页面 | 新增 L1 成功测试；L2/L3 有旁证 | 事务真实落库仍需 L2/集成复核 | 已覆盖 |
| TC1.8.2 非已拒绝状态不显示按钮 | L1 验证 REJECTED 门禁；L2/L3 补接口和显隐 | 新增 L1 非拒绝状态拒绝；L2 有非法状态旁证 | UI 显隐属于 L3，未纳入 L1 门禁 | 已覆盖 |
| TC1.8.3 重新编辑后审计记录 | L1 验证 `RE_EDIT` 审计和事务副作用；L2 补落库查询 | 新增 L1 审计对象断言；L2 有审计旁证 | 事务失败回滚和真实落库仍缺证据 | 部分覆盖 |
| TC1.8.4 重新编辑后可再次发起评审 | L1 验证状态链节点；L2/L3 验证闭环 | L3 有完整旅程旁证；L1 仅覆盖单节点 | 缺状态链的单测，以及独立 L2 闭环证据 | 部分覆盖 |
| TC1.8.5 PM 角色可重新编辑 | L1 验证角色分支；L2 补 RBAC；L3 补显隐 | 新增 L1 PM 成功和非法角色拒绝；L2 有 PM 旁证 | 缺 BA 完整矩阵；PROJECT_MGR 规则仍需确认 | 部分覆盖 |

## 4. 变更逻辑覆盖分类

| 文件 | 变更逻辑 | 分类 | 证据 | 推荐测试层级 |
|---|---|---|---|---|
| `release-train/apps/server/src/modules/requirements/service.ts:1095-1123` | `submitReview` 的 DRAFT 状态门禁和成功状态流转 | 单测已覆盖 | 新增 L1 成功和非草稿拒绝测试，断言结果状态和错误码 | L1 后端单测 |
| `release-train/apps/server/src/modules/requirements/service.ts:1125-1132` | BA 归属、TRAIN_ADMIN、SUPER_ADMIN 权限分支 | 缺少单测 | 新增非归属 BA 拒绝，但缺管理员角色完整矩阵 | L1 后端单测 |
| `release-train/apps/server/src/modules/requirements/service.ts:1134-1155` | 标题、描述、系统、优先级、storyPoints、BA 校验 | 缺少单测 | 仅新增标题缺失，其他字段和边界未覆盖 | L1 后端单测 |
| `release-train/apps/server/src/modules/requirements/service.ts:1160-1175` | version 条件更新、重复请求和冲突分支 | 缺少单测 | 新增成功和 count=0 冲突；顺序重复请求仍未单独覆盖 | L1 后端单测 |
| `release-train/apps/server/src/modules/requirements/service.ts:1178-1201` | `SUBMIT_REVIEW` 审计写入、事务内查询和结果组装 | 单测已覆盖 | 新增状态、version 和审计字段断言；真实事务回滚另由集成测试验证 | L1 后端单测 |
| `release-train/apps/server/src/modules/requirements/service.ts:1567-1595` | `reEdit` 的 REJECTED 门禁和角色判断 | 缺少单测 | 新增非法状态、PM 成功和非法角色；BA/PM 完整矩阵仍缺 | L1 后端单测 |
| `release-train/apps/server/src/modules/requirements/service.ts:1597-1636` | `reEdit` version 更新、`RE_EDIT` 审计和结果组装 | 单测已覆盖 | 新增成功、版本冲突和审计字段断言；真实事务回滚另由集成测试验证 | L1 后端单测 |
| `release-train/apps/server/src/modules/requirements/index.ts:283-295` | 发起评审路由认证、RBAC 和 HTTP 响应包装 | 需要 API/集成/E2E 覆盖 | 路由依赖 Fastify request/reply 和中间件，不适合作为纯 L1 单测目标 | L2 API |
| `release-train/apps/server/src/modules/requirements/index.ts:339-351` | 重新编辑路由认证、RBAC 和 HTTP 响应包装 | 需要 API/集成/E2E 覆盖 | 路由依赖 Fastify request/reply 和中间件，不适合作为纯 L1 单测目标 | L2 API |
| `release-train/packages/shared/src/constants/index.ts` | 操作/权限常量变更 | 排除：无逻辑 | 纯常量，无计算和分支；由 service/route 的行为测试间接使用 | 不适用 |

## 5. 自测检查点 L1 覆盖现状

仅列出本轮适合 L1 单测治理、且与 `submitReview/reEdit` 逻辑相关的检查点。接口契约、页面交互、审计人工核验、性能和真实数据库事务不计入 L1 门禁。

| 检查点 | 优先级 | 现有单测是否已覆盖 | 覆盖证据 |
|---|---|---|---|
| 涉及表数据的任何操作需核对状态和数据准确性 | P0 | 部分 | 新增 L1 断言状态、version、更新条件和审计对象；未验证真实数据库落库 |
| 数据不一致：部分提交或回滚不彻底 | P0 | 否 | 未加入事务失败注入和状态/日志回滚断言 |
| 端到端链路中的状态、version、日志最终一致性（L1 部分） | P0 | 部分 | L1 验证返回结果和关键副作用，真实链路仍由 L2/集成承担 |
| 状态流转符合业务规则 | P0 | 是 | 新增 DRAFT→PENDING_REVIEW、REJECTED→DRAFT 成功单测 |
| 无效状态跳转被拦截 | P0 | 是 | 新增非 DRAFT、非 REJECTED 状态错误码断言 |
| 事务中间状态记录及提交/回滚 | P0 | 部分 | 已验证 updateMany 条件和 statusLog 参数，未验证异常回滚 |
| 异常场景触发回滚或补偿 | P0 | 否 | 未加入 Prisma transaction 故障注入单测 |
| 重复请求仅处理一次并返回冲突/状态错误 | P0 | 部分 | 已覆盖 version 冲突分支，未覆盖两个接口的顺序重复请求 |
| version 并发冲突和数据一致性 | P1 | 部分 | 已覆盖 count=0 冲突业务分支，未执行真实并发 |

## 6. 需补充单测清单

自动补齐已启用；本轮已新建两个 L1 单测文件并完成最小执行。

| 优先级 | 文件 | 检查点/变更逻辑 | 建议测试用例名 | 推荐测试层级 |
|---|---|---|---|---|
| P0 | `apps/server/src/modules/requirements/submit-review.unit.test.ts` | 管理员角色完整权限矩阵 | `shouldAllowTrainAndSuperAdminToSubmitReview` | L1 后端单测 |
| P0 | `apps/server/src/modules/requirements/submit-review.unit.test.ts` | systemId、priority、storyPoints、BA 及标题长度边界 | `shouldRejectSubmitReviewWhenAnyRequiredFieldIsInvalid` | L1 后端单测 |
| P0 | `apps/server/src/modules/requirements/submit-review.unit.test.ts` | 顺序重复请求和事务失败回滚 | `shouldRejectDuplicateSubmitReviewAndRollbackAuditFailure` | L1 后端单测 |
| P0 | `apps/server/src/modules/requirements/re-edit.unit.test.ts` | BA/PM 权限矩阵和不存在需求 | `shouldAllowOnlyAuthorizedReEditOperators` | L1 后端单测 |
| P0 | `apps/server/src/modules/requirements/re-edit.unit.test.ts` | 事务失败后的状态和日志回滚 | `shouldRollbackReEditWhenAuditWriteFails` | L1 后端单测 |
| P0 | `apps/server/src/modules/requirements/requirements-update.unit.test.ts` | 发起评审后不可继续编辑 | `shouldRejectEditingAfterSubmitReview` | L1 后端单测 |
| P1 | `apps/server/src/modules/requirements/re-edit.unit.test.ts` | 重新编辑后的状态链节点 | `shouldLeaveRequirementReadyForSubmitReviewAfterReEdit` | L1 后端单测 |
| P0 | `apps/server/src/modules/requirements/batch-submit-review.unit.test.ts` | 批量发起评审实现缺失及失败策略 | `shouldDefineBatchSubmitReviewFailurePolicy` | L1 后端单测；先补实现 |

### 自动补齐记录（仅启用自动补齐时填写）

| 补齐状态 | 目标测试文件 | 新增/追加测试 | 执行结果 | 覆盖变化 | 阻塞原因 |
|---|---|---|---|---|---|
| 验证通过 | `submit-review.unit.test.ts`、`re-edit.unit.test.ts` | 新增 9 个测试：submitReview 5 个、reEdit 4 个 | 17/17 通过 | `service.ts` 文件级覆盖率由 27.18% 提升至 33.77%；变更行增量覆盖率仍待流水线 | 已验证测试可执行；剩余分支和真实事务需继续补充 |

## 7. 未覆盖或排除风险

| 文件 | 变更逻辑 | 分类 | 原因 | 风险 | 处理要求 |
|---|---|---|---|---|---|
| `apps/server/src/modules/requirements/service.ts` | `submitReview/reEdit` 部分权限、字段和异常分支仍缺 L1 单测 | 缺少单测 | 本轮新增核心成功/拒绝/冲突测试，但未覆盖完整矩阵和事务故障注入 | 状态、权限、字段和回滚回归仍可能漏检 | 补齐剩余 L1 分支并取得变更行覆盖率 |
| `apps/server/src/modules/requirements/index.ts` | 认证、RBAC、HTTP 响应 | 需要 API/集成/E2E 覆盖 | 依赖 Fastify 和中间件边界 | 接口鉴权或错误响应可能回归 | 保留 L2 API 作为旁证并执行 |
| `apps/server/src/modules/requirements/service.ts` | 事务一致性和故障回滚 | 需要 API/集成/E2E 覆盖 | 真实 Prisma 事务不能只靠普通 mock 证明 | 状态已更新但审计未写入等数据一致性风险 | L1 做可隔离分支测试，L2/集成验证真实事务 |
| `apps/server/src/modules/requirements/service.ts` | `US1.8` BA 归属人与 `PROJECT_MGR` 规则存在口径差异 | 缺少单测 | service 只允许 BA/PM，路由权限含 PROJECT_MGR；未确认业务口径 | 角色可能出现接口可进入但 service 拒绝，或越权风险 | 先确认规则，再补权限矩阵单测和 API |
| `apps/server/src/modules/requirements/*` | TC1.5.7/TC1.5.8 批量发起评审 | 缺少单测 | 本轮未发现批量 service/route 实现 | 需求案例无实现闭包，无法建立单测门禁 | 先确认是否属于本轮，补实现后再补 L1/L2 |
| `apps/server/src/modules/requirements/service.ts` | 变更行增量覆盖率 | 阻塞 | 当前只有本地文件级覆盖率，未取得流水线增量数据 | 无法正式判断 >80% 门禁 | 获取流水线覆盖率或执行变更范围 coverage 命令 |

## 8. 单测执行证据

| 证据项 | 内容 |
|---|---|
| 执行命令 | `npx vitest run src/modules/requirements/service.test.ts src/modules/requirements/submit-review.unit.test.ts src/modules/requirements/re-edit.unit.test.ts --coverage`，工作目录 `release-train/apps/server` |
| 执行单测文件数 | 3 |
| 单测通过数 | 17 |
| 单测失败数 | 0 |
| 覆盖率来源 | 本地 Vitest 1.6.1 + V8；流水线数据未取得，当前使用本地结果，待流水线复核 |
| 增量覆盖率计算方式 | 未计算出本轮 commit 变更行增量覆盖率；本地 `requirements/service.ts` 文件级覆盖率为 33.77%，仅作风险证据，不作为通过结论 |

## 9. 最终决策

报告阶段为“最终版”，当前决策：阻塞。

原因：

- 本轮已补齐 `submitReview/reEdit` 的 9 个 L1 单测，连同原有测试共 17/17 通过。
- 权限完整矩阵、字段边界、事务故障回滚、编辑后不可编辑和批量实现仍有缺口。
- 尚未取得本轮变更行增量覆盖率；本地文件级 33.77% 不能替代流水线门禁。

必须处理项：

1. 补齐剩余权限矩阵、字段边界、重复请求和事务回滚单测。
2. 先确认批量发起评审是否属于本轮，再补实现和对应 L1/L2 测试。
3. 获取流水线覆盖率或执行变更范围 coverage，确认增量覆盖率大于 80%。
4. 单独执行 L2 API，验证认证、RBAC、HTTP 响应和真实事务边界。

## 下游报告提示

| 报告字段 | 值 |
|---|---|
| 单测门禁 | 阻塞 |
| 是否可纳入项目经理/测试经理最终报告 | 是 |
| 是否包含 API/集成/E2E 旁证 | 是 |
| 建议交付结论 | 不建议提测 |
