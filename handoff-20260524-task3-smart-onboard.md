# Handoff Document - Task 3: 智能纳版（AI Agent 排期建议）

**日期**: 2026-05-24  
**分支**: task-3-ai-scheduling  
**状态**: 功能开发完成，等待测试

---

## 📋 目的

总结智能纳版功能的开发进度和关键决策，为下一个会话提供交接文档。

---

## ✅ 已完成工作

### 1. Coze 平台配置
- ✅ 创建了 Coze 工作流（Workflow ID: `7643295782439354408`）
- ✅ 配置了工作流输入参数：
  - `trainSchedule`: 班次容量信息
  - `selectedRequirements`: 需求列表（含依赖关系）
- ✅ 配置了系统提示词，支持容量评估、优先级排序（P0 > P1 > P2 > P3）、依赖关系处理
- ✅ 使用新的依赖字段命名：`depId`, `depReqCode`, `depTitle`, `depPriority`, `depStoryPoints`, `depStatus`

### 2. 后端实现
- ✅ **类型定义**: `packages/shared/src/types/smart-onboard.ts`
  - `SmartOnboardSuggestRequest`, `SmartOnboardSuggestResponse`
  - `RequirementForAI`, `DependencyForAI`
  - `OnboardSuggestion`, `ConfirmOnboardRequest`

- ✅ **Coze 客户端**: `apps/server/src/common/coze/index.ts`
  - 使用官方 `@coze/api` SDK
  - 处理 Coze 流式响应（事件类型：`Message`）
  - 从 `data.content` 字段提取 JSON 输出
  - 解析嵌套的 `output` 字段

- ✅ **智能纳版服务**: `apps/server/src/modules/smart-onboard/service.ts`
  - `getScheduleCapacity()`: 从数据库获取班次容量
  - `getRequirementsForAI()`: 获取需求及依赖关系
  - `buildCozeInput()`: 构建 Coze 工作流输入
  - `generateOnboardSuggestions()`: 调用 Coze 并处理响应
  - `confirmOnboard()`: 确认并执行纳版

- ✅ **API 路由**: `apps/server/src/modules/smart-onboard/routes.ts`
  - `POST /api/smart-onboard/suggest`: 生成纳版建议
  - `POST /api/smart-onboard/confirm`: 确认纳版

### 3. 前端实现
- ✅ **API 服务**: `apps/web/src/services/smart-onboard.ts`
  - 封装了调用后端 API 的函数

- ✅ **智能纳版组件**: `apps/web/src/components/smart-onboard/SmartOnboardSuggestion.tsx`
  - 提供 AI 智能纳版按钮组件

- ✅ **集成页面**: `apps/web/src/pages/trains/schedule-detail.tsx`
  - 在纳版管理中添加「AI 智能纳版」按钮
  - 完整的智能纳版建议模态框
  - 支持查看容量分析、建议列表、警告信息
  - 支持一键确认纳版

### 4. 配置文档
- ✅ **使用指南**: `release-train/SMART_ONBOARD_GUIDE.md`
  - 完整的配置步骤
  - 使用说明
  - 调试指南
  - 常见问题

### 5. 环境配置
- ✅ **Coze API Key**: `pat_yTvxGaUchbPifKjXjf3Ovj5W6Mg47PqdLqOgK8guGCvA6lTwjVUzPq6OudBYcAqq`
- ✅ **工作流 ID**: `7643295782439354408`
- ✅ **API 基础 URL**: `https://api.coze.cn`
- ✅ **配置文件**: `.env` (release-train 目录)

### 6. 测试验证
- ✅ **Coze 工作流测试**: curl 测试成功
- ✅ **返回格式验证**: 
  ```json
  {
    "output": {
      "analysis": {...},
      "success": true,
      "suggestions": [...],
      "warnings": [...],
      "summary": "..."
    }
  }
  ```

---

## 📝 关键决策

### 1. 依赖关系字段命名
**决策**: 使用 `depId`, `depReqCode`, `depTitle` 等简化的字段名，而不是完整的嵌套对象。

**原因**: 便于 Coze Prompt 中的变量引用，减少嵌套层级。

### 2. Coze SDK 使用
**决策**: 使用官方 `@coze/api` SDK，使用 `workflows.runs.stream()` 方法。

**原因**: 官方 SDK 提供更好的类型安全和错误处理。

### 3. 输出格式处理
**决策**: Coze 返回的 JSON 在 `data.content` 字段中，是一个 JSON 字符串，需要解析后提取 `output` 字段。

**验证**: curl 测试确认了输出格式。

---

## ⏳ 待完成任务

### 高优先级
1. **功能测试**
   - 启动后端服务 `pnpm dev:server`
   - 启动前端服务 `pnpm dev:web`
   - 在浏览器中测试完整的智能纳版流程

2. **依赖关系测试**
   - 测试有依赖关系的需求排序
   - 测试容量超限场景
   - 测试依赖未完成/已取消场景

### 中优先级
3. **日志优化**
   - 减少生产环境日志输出
   - 添加结构化日志记录

4. **错误处理增强**
   - Coze API 超时处理
   - 网络错误重试机制

5. **前端交互优化**
   - 添加加载状态动画
   - 优化建议列表的展示效果
   - 添加拖拽排序功能（可选）

---

## 📁 相关文件

### 核心代码文件
- `packages/shared/src/types/smart-onboard.ts` - 类型定义
- `apps/server/src/common/coze/index.ts` - Coze 客户端
- `apps/server/src/modules/smart-onboard/service.ts` - 业务服务
- `apps/server/src/modules/smart-onboard/routes.ts` - API 路由
- `apps/web/src/services/smart-onboard.ts` - 前端 API 服务
- `apps/web/src/components/smart-onboard/SmartOnboardSuggestion.tsx` - 前端组件
- `apps/web/src/pages/trains/schedule-detail.tsx` - 集成页面

### 文档文件
- `release-train/SMART_ONBOARD_GUIDE.md` - 使用指南
- `.trae/specs/task-3-ai-scheduling/RT-Task3-智能纳版AI排期建议-设计方案_v1.0_20260524.md` - 设计方案
- `.trae/specs/task-3-ai-scheduling/COZE_QUICKSTART.md` - Coze 配置指南

### 测试文件
- `apps/server/test-real-api.js` - Coze API 测试脚本

---

## 🎯 下一个会话建议

### 立即行动
1. **启动服务测试**
   ```bash
   cd release-train
   pnpm dev:server  # 启动后端
   pnpm dev:web     # 启动前端
   ```

2. **功能验证**
   - 访问 http://localhost:5173
   - 进入班次详情页 → 纳版管理
   - 选择需求 → 点击「AI 智能纳版」
   - 查看 AI 生成的建议
   - 点击「确认纳版」

### 测试场景
1. 正常场景（容量足够）
2. 容量超限（警告测试）
3. 依赖未完成（警告测试）
4. 依赖已取消（警告测试）

### 后续优化
1. 添加单元测试
2. 优化前端交互
3. 添加性能监控

---

## 💡 关键上下文

### Coze 工作流配置要点
- **输入参数**: `trainSchedule` + `selectedRequirements`
- **依赖字段**: 使用 `depId`, `depReqCode` 等简化命名
- **输出格式**: 
  - 事件类型：`Message`（大写）
  - 数据字段：`data.content`（JSON 字符串）
  - 提取路径：`JSON.parse(content).output`

### API 端点
- **生成建议**: `POST /api/smart-onboard/suggest`
- **确认纳版**: `POST /api/smart-onboard/confirm`

### 环境变量
```env
COZE_API_KEY=pat_yTvxGaUchbPifKjXjf3Ovj5W6Mg47PqdLqOgK8guGCvA6lTwjVUzPq6OudBYcAqq
COZE_WORKFLOW_ID=7643295782439354408
COZE_BASE_URL=https://api.coze.cn
```

---

## 📞 联系方式

如有问题，请参考：
- 使用指南: `release-train/SMART_ONBOARD_GUIDE.md`
- Coze 平台测试: https://www.coze.cn/work_flow
- API 调试链接: https://www.coze.cn/work_flow?execute_id=...

---

**交接完成时间**: 2026-05-24 13:35 CST  
**交接人**: AI Assistant  
**下一步**: 启动服务并进行功能测试
