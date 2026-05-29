# US1.4 需求详情查看 — 验收清单

## 类型定义
- [x] StatusLogItem 接口已定义（operatorName, operationType, fromStatus, toStatus, reason, createdAt）
- [x] DependencyItem 接口已扩展 riskLevel 字段
- [x] RequirementDetail 接口已扩展 statusLogs 字段

## 后端 API
- [x] GET /api/requirements/:id 响应包含 statusLogs 数组（按时间倒序）
- [x] GET /api/requirements/:id 响应 dependencies 中每条含 riskLevel 字段
- [x] statusLogs 中 operationType 正确映射（CREATE/SUBMIT_REVIEW 等）
- [x] 新创建的需求 statusLogs 包含一条 CREATE 记录
- [x] 依赖风险分级逻辑正确（已纳版→null, 已就绪→warning, 草稿→high, 已取消→critical）

## 前端详情页

### 返回列表
- [x] AC1.4.7: 顶部"← 返回列表"链接存在，点击回到列表页并保留筛选条件

### 基本信息
- [x] AC1.4.1: 从列表点击需求行进入详情页，展示完整信息
- [x] AC1.4.2: 基本信息以 2 列网格布局展示，字段名和值对齐
- [x] 子状态展示：已纳版状态时显示"已纳版-开发中"等格式

### 需求描述
- [x] AC1.4.3: 需求描述正确渲染富文本内容（加粗、列表等）

### 依赖列表
- [x] AC1.4.4: 依赖区域展示每条依赖的需求编号、标题、状态、风险等级 Tag
- [x] 风险等级颜色：无风险(绿)、warning(橙)、high(红)、critical(红加粗)

### 操作历史
- [x] AC1.4.5: 操作历史以时间线样式展示，按时间倒序
- [x] 每条记录显示：操作时间、操作人姓名、操作类型、原因/备注
- [x] 操作类型显示为中文标签

### 操作按钮
- [x] AC1.4.6: 底部操作按钮与 US1.3 列表页操作按钮矩阵一致
- [x] 草稿状态 BA 角色：编辑、发起评审、取消
- [x] 已投产状态：无操作按钮
- [x] 封板状态 BA 角色：紧急变更、取消

### 整体
- [x] 详情页加载中显示 Spin
- [x] 详情页加载失败显示错误信息和返回按钮