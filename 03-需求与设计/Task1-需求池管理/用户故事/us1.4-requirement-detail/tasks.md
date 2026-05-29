# Tasks

- [x] Task 1: 类型定义扩展（shared 包）
  - [x] SubTask 1.1: 新增 StatusLogItem 接口到 `packages/shared/src/types/requirement.ts`
  - [x] SubTask 1.2: DependencyItem 接口新增 riskLevel 字段
  - [x] SubTask 1.3: RequirementDetail 接口新增 statusLogs 字段
  - [x] SubTask 1.4: shared 包重新构建（`pnpm build:shared`）

- [x] Task 2: 后端 — 详情接口增强（statusLogs + riskLevel）
  - [x] SubTask 2.1: buildRequirementDetail 函数扩展：查询 statusLogs 并组装为 StatusLogItem[]
  - [x] SubTask 2.2: buildRequirementDetail 函数扩展：为每条 dependency 计算 riskLevel
  - [x] SubTask 2.3: 编写后端单元测试：验证详情接口返回 statusLogs 和 riskLevel

- [ ] Task 3: 前端 — 详情页 UI 重构
  - [ ] SubTask 3.1: 页面标题区新增"← 返回列表"链接（带筛选参数回传）
  - [ ] SubTask 3.2: 子状态展示优化（已纳版时显示"已纳版-开发中"等格式）
  - [ ] SubTask 3.3: 依赖列表新增风险等级 Tag 列
  - [ ] SubTask 3.4: 新增操作历史时间线区域（Ant Design Timeline，按时间倒序）
  - [ ] SubTask 3.5: 底部新增操作按钮区域（复用 US1.3 操作按钮矩阵逻辑）
  - [ ] SubTask 3.6: 详情页整体布局调整为：基本信息(左) + 人员/时间(右) → 需求描述 → 依赖列表 → 操作历史 → 操作按钮

- [x] Task 4: 集成验证
  - [x] SubTask 4.1: 验证详情页操作按钮与 US1.3 列表页操作按钮矩阵一致
  - [x] SubTask 4.2: 验证操作历史时间线数据正确（创建后应有 CREATE 记录）
  - [x] SubTask 4.3: 验证依赖风险等级颜色正确

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3