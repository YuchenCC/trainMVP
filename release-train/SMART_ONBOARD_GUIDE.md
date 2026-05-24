
# 智能纳版功能使用指南

## 📋 功能概述

智能纳版功能通过 Coze AI 工作流，根据班次容量、需求优先级和依赖关系自动生成纳版建议。

## 🔧 配置步骤

### 1. Coze 工作流配置

确保您的 Coze 工作流已正确配置：
- 工作流 ID：`7643295782439354408`
- 输入参数：
  - `trainSchedule`：班次容量信息
  - `selectedRequirements`：需求列表（含依赖关系）

### 2. 环境变量配置

在项目根目录 `.env` 文件中添加：
```env
# Coze 智能纳版
COZE_API_KEY=你的真实APIKey
COZE_WORKFLOW_ID=7643295782439354408
COZE_BASE_URL=https://api.coze.cn
```

### 3. 依赖关系格式

需求的 `dependencies` 字段格式：
```json
{
  "dependencies": [
    {
      "depId": "req-xxx",
      "depReqCode": "REQ-2026-xxx",
      "depTitle": "依赖需求标题",
      "depPriority": "P0",
      "depStoryPoints": 5,
      "depStatus": "READY"
    }
  ]
}
```

## 🚀 使用说明

### 前端使用

1. 进入班次详情页
2. 在纳版管理中勾选要纳版的需求
3. 点击「AI 智能纳版」按钮
4. 查看 AI 生成的建议和警告
5. 调整顺序后点击「确认纳版」

### 后端 API

#### 生成建议
```
POST /api/smart-onboard/suggest
{
  "scheduleId": "班次ID",
  "requirementIds": ["需求ID1", "需求ID2"]
}
```

#### 确认纳版
```
POST /api/smart-onboard/confirm
{
  "scheduleId": "班次ID",
  "requirementIds": ["需求ID1", "需求ID2"]
}
```

## 🔍 调试说明

### Coze 工作流测试

在 Coze 平台上先测试工作流是否正常输出。

### 查看服务日志

后端服务会输出详细的 Coze API 调用日志：
- 输入参数
- 事件流
- 输出解析过程

### 测试数据示例

```json
{
  "trainSchedule": {
    "name": "2026年Q2第2班",
    "totalCapacity": 50,
    "usedCapacity": 40,
    "remainingCapacity": 10
  },
  "selectedRequirements": [
    {
      "id": "req-101",
      "reqCode": "REQ-2026-0101",
      "title": "用户登录优化",
      "priority": "P0",
      "storyPoints": 8,
      "system": "用户中心",
      "status": "READY",
      "dependencies": []
    },
    {
      "id": "req-102",
      "reqCode": "REQ-2026-0102",
      "title": "订单列表优化",
      "priority": "P1",
      "storyPoints": 5,
      "system": "订单系统",
      "status": "READY",
      "dependencies": []
    }
  ]
}
```

## 📁 文件结构

- `packages/shared/src/types/smart-onboard.ts`：类型定义
- `apps/server/src/common/coze/index.ts`：Coze 客户端
- `apps/server/src/modules/smart-onboard/`：智能纳版模块
- `apps/web/src/components/smart-onboard/`：智能纳版前端组件
- `apps/web/src/pages/trains/schedule-detail.tsx`：集成页面

## ⚠️ 常见问题

### 401 认证错误
- 检查 API Key 是否正确
- 确认 API Key 是否在有效期内
- 检查 baseURL 是否正确

### 解析错误
- 查看服务日志中的「原始输出」
- 确认 Coze 工作流的输出格式是否正确

### 输出为空
- 检查工作流是否正确连接
- 查看所有事件数据
