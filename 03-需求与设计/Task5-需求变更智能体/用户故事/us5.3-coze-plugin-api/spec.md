# US5.3 Coze 插件 API 规格

## Why

Coze 需求变更智能体需要通过 API 查询版本火车系统中的存量数据（系统、需求），并创建变更单同步回系统。需要为插件单独设计鉴权方式（API Key，非 JWT Session）和接口。

## What Changes

- 新增 `/api/plugin/` 路径前缀的插件专用 API
- Header `X-Plugin-Key` 鉴权（环境变量 PLUGIN_API_KEY）
- 4 个接口：按名称查询系统、查询系统需求列表、获取需求详情、创建变更单

## Impact

- Affected specs：T5 需求变更智能体（被 US5.4 Coze 工作流依赖）
- Affected code：
  - `apps/server/src/modules/plugin/`（新增插件模块）
  - `.env`（新增 PLUGIN_API_KEY）

## ADDED Requirements

### Requirement: 按系统名查询系统

系统 SHALL 支持 Coze 插件通过系统名称模糊查询系统信息。

#### Scenario: 系统存在时
- **WHEN** 请求 GET /api/plugin/systems?name=订单管理，Header 含有效 X-Plugin-Key
- **THEN** 返回系统 id/name/description/requirementCount

#### Scenario: 系统不存在时
- **WHEN** 查询名称不匹配任何系统
- **THEN** data 为 null

#### Scenario: 无有效 API Key
- **WHEN** Header 缺少 X-Plugin-Key 或 Key 无效
- **THEN** 返回 success:false, code:UNAUTHORIZED

### Requirement: 查询系统下的需求列表

系统 SHALL 支持 Coze 插件按系统ID和关键词查询需求列表，用于需求变更时对比存量需求。

#### Scenario: 有关键词过滤
- **WHEN** 请求 GET /api/plugin/systems/{id}/requirements?keyword=导出
- **THEN** 返回标题匹配关键词的需求列表

### Requirement: 获取需求详情

系统 SHALL 支持 Coze 插件获取需求完整信息，包括依赖关系、变更历史。

#### Scenario: 需求存在
- **WHEN** 请求 GET /api/plugin/requirements/{id}
- **THEN** 返回完整需求详情，含 dependencies 和 changeRequests

### Requirement: 通过插件创建变更单

系统 SHALL 支持 Coze 插件创建变更单，source 字段自动标记为 "coze"。

#### Scenario: 创建变更单
- **WHEN** Coze 插件提交变更分析结果
- **THEN** 创建 ChangeRequest，source 自动设为 "coze"
