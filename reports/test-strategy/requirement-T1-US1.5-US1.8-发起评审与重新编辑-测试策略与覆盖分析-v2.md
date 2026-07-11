# T1-US1.5/US1.8 发起评审与重新编辑 — 测试策略与覆盖分析

> **版本**: v2
> **分析范围**: T1-需求池管理，聚焦 US1.5 发起评审（DRAFT→PENDING_REVIEW）、US1.8 重新编辑（REJECTED→DRAFT）
> **生成日期**: 2026-07-11

---

## 一、分析范围

| 项目 | 内容 |
|---|---|
| 分析范围 | T1-需求池管理，聚焦 US1.5 发起评审（DRAFT→PENDING_REVIEW）、US1.8 重新编辑（REJECTED→DRAFT） |
| 测试案例来源 | 飞书 Wiki "Task 1: 需求池管理 - 测试案例"（token: GyNdwKDujipJwEkxyHlcLWyanuf），已读取正文（注：纯文本返回，表格详情被压缩为案例标题行，未获取完整测试步骤/预期结果） |
| 需求/设计来源 | 飞书 Docx "Task 1: 需求池管理 — 用户故事"（token: POredlznoooVXIxpVyQcnAQ8nkg，v1.3，2026-05-15），已读取正文，含 BR1.5.1~BR1.5.6、BR1.8.1~BR1.8.5 及 AC |
| 来源载体与读取状态 | 飞书 Wiki（测试案例）：已读取正文，但表格详情被压缩；飞书 Docx（用户故事）：已读取正文 |
| 代码范围 | 后端：service.ts（submitReview L1095-1201、reEdit L1567-1636）、index.ts（路由 L282-353）、constants/index.ts（权限矩阵）；前端：services/requirement.ts（L77-80、L111-114） |
| 提交范围 | 9a6d9266（US1.5 发起评审实现）、a40674ee（US1.8 重新编辑实现） |
| 存量报告处理 | 存在 v1 报告，用户确认不复用 |

---

## 二、口径差异

| 差异项 | 需求文档定义（飞书用户故事 v1.3） | 代码实际实现 | 影响评估 | 建议 |
|---|---|---|---|---|
| **RE_EDIT 权限** | BR1.8.2：BA、PM 可重新编辑；操作按钮矩阵中已拒绝行仅 BA 和 PM 有"重新编辑" | 路由 index.ts L343 复用 `Operation.EDIT_REQ`（BA/PM/PROJECT_MGR）；service.ts L1589-1593 仅允许 BA、PM。但路由层额外放行了 PROJECT_MGR | **[高风险]** 路由层 PROJECT_MGR 可通过中间件但在 service 层被拦截。两层不一致可能混淆排查 | 统一路由与 service 权限判断；路由改为专用 Operation.RE_EDIT |
| **SUBMIT_REVIEW 权限** | BR1.5.2：BA（归属人）或火车管理员 | 代码 L1126-1132：BA必须是归属人、TRAIN_ADMIN、SUPER_ADMIN 均可 | **[低风险]** 代码比需求更宽松（多了 SUPER_ADMIN），属防御性实现 | 确认 SUPER_ADMIN 是否需要；通常保留 |
| **标题长度校验** | BR1.1.1：标题 2-100 字符 | 代码 L1135-1139：空标题报错，超过 200 字符报错 | **[中风险]** 后端校验与需求不一致（2-100 vs 空值+200） | 统一前后端校验规则 |
| **批量发起评审** | TC1.5.7 / TC1.5.8 覆盖批量场景；OperationType 定义了 BATCH_SUBMIT_REVIEW | 代码中无 batchSubmitReview 路由或服务方法 | **[中风险]** 功能未实现，TC1.5.7/TC1.5.8 无法执行 | 确认是否属后续迭代；若是，标注"待实现" |

---

## 三、飞书来源记录表

| 来源类型 | 标题 | 链接或 token | 读取时间 | 读取状态 | 用途 |
|---|---|---|---|---|---|
| 飞书 Wiki | Task 1: 需求池管理 - 测试案例 | https://qcnw7bzb5cpd.feishu.cn/wiki/GyNdwKDujipJwEkxyHlcLWyanuf | 2026-07-11 | 已读取正文（表格详情被压缩） | 测试案例 |
| 飞书 Docx | Task 1: 需求池管理 — 用户故事 | POredlznoooVXIxpVyQcnAQ8nkg | 2026-07-11 | 已读取正文 | 需求/设计（BR/AC） |

---

## 四、测试案例分层策略矩阵（模块 B 锁定）

### US1.5 发起评审（8 个案例）

| 需求点/案例组 | 测试案例 | 测试目标 | 推荐层级 | 分层理由 | 优先级 |
|---|---|---|---|---|---|
| US1.5 正常流程 | TC1.5.1 | BA 归属人正常发起评审，DRAFT→PENDING_REVIEW | L2 API | 涉及路由+鉴权+状态流转+事务+审计日志写入，API 层验证完整链路 | P0 |
| US1.5 状态校验 | TC1.5.2 | 非草稿状态不显示/不可发起评审 | L2 API | 后端状态校验是核心逻辑（service L1121），需 API 验证 | P0 |
| US1.5 权限校验 | TC1.5.3 | 非 BA 角色不显示/不可发起评审 | L2 API | 后端权限校验涉及 BA 归属人判断+TRAIN_ADMIN/SUPER_ADMIN 分支 | P0 |
| US1.5 字段校验 | TC1.5.4 | 必填字段不完整时提示 | L2 API | 后端 6 个必填字段逐一校验（L1134-1155），需 API 验证完整链路 | P0 |
| US1.5 不可编辑 | TC1.5.5 | 发起评审后需求不可编辑 | L2 API | 后端编辑接口独立做状态校验，需 API 验证编辑被拦截 | P0 |
| US1.5 审计 | TC1.5.6 | 审计日志记录 SUBMIT_REVIEW | L2 API | 审计日志在事务内写入（L1178-1186），需 API 验证完整性 | P0 |
| US1.5 批量 | TC1.5.7 | 批量发起评审（全部草稿） | L2 API | 批量事务操作，需 API 验证 | P1 |
| US1.5 批量异常 | TC1.5.8 | 批量发起评审含非草稿（部分失败） | L2 API | 批量部分失败回滚，需 API 验证 | P1 |

### US1.8 重新编辑（5 个案例）

| 需求点/案例组 | 测试案例 | 测试目标 | 推荐层级 | 分层理由 | 优先级 |
|---|---|---|---|---|---|
| US1.8 正常流程 | TC1.8.1 | BA 正常重新编辑，REJECTED→DRAFT | L2 API | 状态流转+权限+事务+审计，API 层验证完整链路 | P1 |
| US1.8 状态校验 | TC1.8.2 | 非已拒绝状态不显示按钮 | L2 API | 后端状态校验（L1585），需 API 验证 | P1 |
| US1.8 审计 | TC1.8.3 | 重新编辑后审计记录 RE_EDIT | L2 API | 审计日志事务内写入（L1613-1621） | P1 |
| US1.8 链路 | TC1.8.4 | 重新编辑后可再次发起评审 | L3 UI / L2 API | 完整状态链 REJECTED→DRAFT→PENDING_REVIEW，前端跨页面验证 | P1 |
| US1.8 权限 | TC1.8.5 | PM 角色可重新编辑 | L2 API | PM 权限在 service 层明确校验（L1590-1591） | P1 |

---

## 五、模块 C 自测检查点审查结果

完整遍历 self-test-checkpoints.md 全部 47 个叶子检查点。以下为涉及/待确认项（主报告展示）：

| 检查点类别路径 | 检查点原文 | 代码审查结论 | 建议层级 | 案例处理 | TODO |
|---|---|---|---|---|---|
| 一、交互类 / 1. 接口 | 前后端校验规则是否一致，字段关联、校验规则（必填/格式/范围） | **涉及**。submitReview 后端 L1134-1155 校验 6 个必填字段（标题空值+200字符、描述空值、systemId、priority、storyPoints 1-100、baId）；前端 requirement.ts L77-80 仅 POST 无 payload 校验。**口径差异**：后端标题上限 200 vs 需求 100 | L2 | TC1.5.4 部分覆盖（仅标题/描述缺失） | 补充 systemId/priority/storyPoints/baId 各自缺失的 L2 测试 |
| 一、交互类 / 1. 接口 | 报文格式/长度/加密规则 | **涉及**。两个接口均无请求体（POST 仅 URL 参数 id），响应 ApiResponse\<RequirementDetail\> | L2 | TC1.5.1 / TC1.8.1 覆盖 | 无 |
| 一、交互类 / 1. 接口 | 防重发 | **涉及**。无显式幂等键；依赖乐观锁（L1160-1175、L1597-1611）+ 状态校验防重复 | L2 | TC1.5.12 乐观锁覆盖；重复提交被状态校验拦截 | 无 |
| 一、交互类 / 1. 接口 | 正常流程测试 | **涉及**。submitReview 和 reEdit 两个接口的正常链路 | L2 | TC1.5.1、TC1.8.1 覆盖 | 无 |
| 一、交互类 / 1. 接口 | 边界条件测试 | **涉及**。storyPoints 范围 1-100、标题长度 | L2 | 部分覆盖 | 补充边界值（0、1、100、101）L2 测试 |
| 一、交互类 / 1. 接口 | 错误处理测试 | **涉及**。REQUIREMENT_NOT_DRAFT、PERMISSION_DENIED、BAD_REQUEST、VERSION_CONFLICT 等错误码 | L2 | TC1.5.4-TC1.5.12、TC1.8.3-TC1.8.11 覆盖 | 无 |
| 一、交互类 / 2. 交互 | 提交/确认按钮添加 loading，防止重复点击 | **待确认**。前端组件未读取，无法确认是否有 loading 状态 | L3 | 未覆盖 | 前端代码确认后补充 |
| 一、交互类 / 2. 交互 | 接口异常时仅返回业务必要的报错信息 | **涉及**。错误由 errors 工具函数统一返回，未暴露内部信息 | L2 | 错误处理案例覆盖 | 无 |
| 一、交互类 / 2. 交互 | 敏感操作二次确认 | **涉及**。发起评审和重新编辑是状态变更操作，应二次确认 | L3 | 未覆盖 | 补充 L3 二次确认弹窗测试 |
| 二、管理类 / 1. 权限控制 | 用户、角色、权限控制符合业务需求 | **涉及**。SUBMIT_REVIEW=[BA,TRAIN_ADMIN]（中间件）+ BA 归属人判断（service）；reEdit 路由用 EDIT_REQ=[BA,PM,PROJECT_MGR] 但 service 仅允许 BA/PM | L2 | TC1.5.3/4/5/6、TC1.8.2/3/4/5/6/7 覆盖 | 确认路由层 PROJECT_MGR 放行是否为 bug |
| 二、管理类 / 2. 数据操作 | 涉及表数据的任何操作，请求内容需与表数据进行准确性核对 | **涉及**。两个接口均涉及 Requirement 表 status/version 字段更新 + StatusLog 表插入 | L2 | 事务+审计案例覆盖 | 无 |
| 二、管理类 / 3. 批量操作 | 数据不一致：部分提交或回滚不彻底 | **涉及**。TC1.5.7/TC1.5.8 涉及批量操作，但代码未实现 | L2 | TC1.5.7/TC1.5.8 缺失（代码未实现） | 代码实现后补充 |
| 二、管理类 / 4. 审计 | 对数据操作是否满足审计要求 | **涉及**。两个接口均在事务内写入 StatusLog（SUBMIT_REVIEW/RE_EDIT） | L2 + M | TC1.5.6、TC1.8.3 覆盖 | 无 |
| 三、交易类 / 1. 数据一致性 | 端到端链路测试 | **涉及**。状态流转涉及 Requirement + StatusLog 两表事务 | L1 + L2 | TC1.5.1、TC1.8.1 L2 覆盖 | 建议补 L1 事务一致性单测 |
| 三、交易类 / 4. 状态流转 | 验证所有状态流转是否符合业务规则 | **涉及**。DRAFT→PENDING_REVIEW、REJECTED→DRAFT | L1 | L2 案例间接覆盖 | 建议抽出状态判断纯函数后补 L1 |
| 三、交易类 / 4. 状态流转 | 确保无效状态跳转被拦截 | **涉及**。非 DRAFT 不允许 submitReview，非 REJECTED 不允许 reEdit | L1 | TC1.5.9、TC1.8.8/TC1.8.9 L2 覆盖 | 无 |
| 三、交易类 / 5. 异常回滚 | 异常场景模拟测试：验证是否触发回滚 | **涉及**。两个接口均使用 prisma.$transaction，乐观锁冲突时事务回滚 | L1 | TC1.5.12 L2 覆盖 | 无 |
| 三、交易类 / 6. 幂等设计 | 重复请求测试 | **涉及**。无显式幂等键，依赖状态+乐观锁防重 | L2 | TC1.5.12、TC1.5.14 覆盖 | 无 |
| 十、安全 / 2. 访问控制 | 是否存在越权风险，主要是 API，操作者与被操作资源之间的权限判断应完整闭合 | **涉及**。submitReview 校验 BA 归属人（水平越权）；reEdit 未校验归属人（任何 BA/PM 可重新编辑任何已拒绝需求） | L2 | TC1.5.6 覆盖水平越权；reEdit 无水平越权测试 | 补充 reEdit 非归属人 BA 操作测试 |

**不涉及项说明**：47 项中其余 30 项判定为不涉及，包括：调用接口超时配置、频率限制/限流、重试机制、文件上传/存储/下载/资源释放、循环递归/多线程/复杂算法、配置文件/环境变量/脚本、数据库库表设计/迁移/供数/订阅、定时任务调度/容错/异常控制/并发控制、界面兼容性、金额/账务/序列号、短信炸弹、XSS/SQL注入、数据安全脱敏/加密、下发安全备份等。

---

## 六、模块 D 测试资产覆盖分析

### 已有测试资产

1. **t1-us1-requirement-entry.test.ts**（L2 API 层，Vitest + Supertest 集成）
   - US1.5：TC1.5.1~TC1.5.14 共 14 个测试
   - US1.8：TC1.8.1~TC1.8.13 共 13 个测试

2. **t1-requirements-api-automation.test.ts**（L2 API 层）
   - TC1.5.1、TC1.5.2、TC1.5.3

3. **journey-1-create-review-pass.test.ts**（L3 E2E，Playwright）
   - Journey 1: BA 录入需求→发起评审→PM 审批通过

4. **前端 services/requirement.ts** — 仅 API 调用封装，无前端单测

5. **无前端组件测试、无 JMeter 脚本、无 service.test.ts 覆盖 submitReview/reEdit**

### 逐案例覆盖结论

#### US1.5

| 测试案例 | 推荐层级 | 资产层级 | 覆盖结论 | 覆盖证据 |
|---|---|---|---|---|
| TC1.5.1 | L2 | L2 | **已覆盖** | t1-us1-requirement-entry.test.ts TC1.5.1 + api-automation TC1.5.1 + journey-1 E2E |
| TC1.5.2 | L2 | L2 | **部分覆盖** | 后端状态校验已覆盖；前端按钮显隐未验证 |
| TC1.5.3 | L2 | L2 | **部分覆盖** | 后端权限校验已覆盖 TC1.5.4/5/6；前端权限按钮矩阵未验证 |
| TC1.5.4 | L2 | L2 | **部分覆盖** | 仅标题/描述缺失 TC1.5.7/8；systemId/priority/storyPoints/baId 缺失未单独测试 |
| TC1.5.5 | L2 | 无 | **缺失** | 无编辑拦截测试 |
| TC1.5.6 | L2 | L2 | **已覆盖** | TC1.5.13 |
| TC1.5.7 | L2 | 无 | **缺失** | 代码未实现 batchSubmitReview |
| TC1.5.8 | L2 | 无 | **缺失** | 代码未实现 |

#### US1.8

| 测试案例 | 推荐层级 | 资产层级 | 覆盖结论 | 覆盖证据 |
|---|---|---|---|---|
| TC1.8.1 | L2 | L2 | **已覆盖** | TC1.8.1 + api-automation 间接 + journey-1 E2E Journey 2 |
| TC1.8.2 | L2 | L2 | **部分覆盖** | 后端已覆盖 TC1.8.8/9；前端按钮显隐未验证 |
| TC1.8.3 | L2 | L2 | **已覆盖** | TC1.8.13 |
| TC1.8.4 | L3/L2 | L3 | **已覆盖** | journey-1 E2E Journey 2 完整链路 |
| TC1.8.5 | L2 | L2 | **已覆盖** | TC1.8.2 |

---

## 七、覆盖现状汇总

| 用户故事 | 案例总数 | 已覆盖 | 部分覆盖 | 缺失 |
|---|---:|---:|---:|---:|
| US1.5 发起评审 | 8 | 3 | 3 | 2 |
| US1.8 重新编辑 | 5 | 3 | 1 | 0 |
| **合计** | **13** | **6 (46%)** | **4 (31%)** | **2 (15%)** |

> **可复用测试资产**：3 个测试文件（t1-us1-requirement-entry.test.ts、t1-requirements-api-automation.test.ts、journey-1-create-review-pass.test.ts）

---

## 八、TODO 清单

| 优先级 | 待办行动 | 关联测试资产 | 完成标准 |
|---|---|---|---|
| P0 | 统一标题长度校验：后端 200 → 100，或需求文档更新 | service.ts L1138 | 前后端校验规则一致 |
| P0 | 统一 reEdit 路由权限：EDIT_REQ → 专用 RE_EDIT | index.ts L343, constants/index.ts | 路由层与 service 层权限一致 |
| P0 | 对本次后端增量代码执行单测门禁检查 | t1-us1-requirement-entry.test.ts | 增量覆盖率 > 80%、通过率 100%，由 unit-test-governance 判定 |
| P1 | 补充 TC1.5.4 各必填字段缺失的 L2 测试 | t1-us1-requirement-entry.test.ts | systemId/priority/storyPoints/baId 各至少 1 个用例 |
| P1 | 补充 TC1.5.5 发起评审后编辑拦截 L2 测试 | t1-us1-requirement-entry.test.ts | PENDING_REVIEW 状态调用编辑接口返回错误 |
| P1 | 补充 reEdit 水平越权 L2 测试 | t1-us1-requirement-entry.test.ts | 非归属人 BA 重新编辑被拦截 |
| P1 | 确认 TC1.5.7/TC1.5.8 批量发起评审是否属后续迭代 | 无 | 案例表标注"待实现"或补充代码 |
| P2 | 前端发起评审/重新编辑按钮权限显隐 L3 测试 | 无 | Playwright 按钮可见性测试 |
| P2 | 前端二次确认弹窗 L3 测试 | 无 | Playwright 弹窗确认测试 |

---

## 九、风险提醒

| 风险 | 影响 | 建议 |
|---|---|---|
| reEdit 路由与 service 权限不一致 | PROJECT_MGR 可通过路由中间件但被 service 拦截，错误码不明确 | 统一为专用 Operation.RE_EDIT |
| 标题长度后端 200 vs 需求 100 | 可能录入超长标题 | 统一校验规则 |
| reEdit 无水平越权校验 | 任何 BA/PM 可重新编辑他人已拒绝需求 | 确认是否需要归属人校验 |
| 批量发起评审未实现 | TC1.5.7/TC1.5.8 无法执行 | 确认迭代范围 |
| 飞书测试案例表格详情无法获取 | 案例步骤和预期结果不完整，可能遗漏边界场景 | 补充本地案例详情或导出飞书表格 |

---

## 十、人工验证方案

本轮未启用人工验证。

---

*报告结束 — v2 — 2026-07-11*