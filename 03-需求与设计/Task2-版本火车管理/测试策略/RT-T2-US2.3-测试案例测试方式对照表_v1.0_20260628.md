# US2.3 班次列表查询与火车切换 - 测试案例测试方式对照表

**版本号**: v1.0  
**日期**: 2026-06-28  
**状态**: 基于代码分析生成  
**来源**: RT-T2-US2.3-班次列表查询与火车切换-测试案例_v1.1_20260516.md

---

## 一、测试方式统计

| 测试方式 | 数量 | 占比 |
|---------|------|------|
| L1 单测 | 0 | 0% |
| L2 API自动化 | 8 | 35% |
| L3 Playwright | 12 | 52% |
| 差距验证 | 3 | 13% |
| **合计** | **23** | 100% |

---

## 二、详细对照表

### 2.1 后端接口测试（L2 API自动化）

| 案例编号 | 测试目的 | 测试方式 | 测试工具 | 覆盖逻辑 | 优先级 |
|---------|---------|---------|---------|---------|-------|
| TC2.3-API-01 | 查询全局班次列表 | L2 API自动化 | Vitest + Supertest | `GET /api/schedules` 返回 200 + list + pagination | P0 |
| TC2.3-API-02 | 全局班次列表分页 | L2 API自动化 | Vitest + Supertest | page/pageSize 参数传递正确，pagination 返回正确 | P0 |
| TC2.3-API-03 | 全局班次按创建时间倒序 | L2 API自动化 | Vitest + Supertest | `orderBy: { createdAt: 'desc' }` 验证 | P0 |
| TC2.3-API-04 | 查询指定火车班次列表 | L2 API自动化 | Vitest + Supertest | `GET /api/trains/:trainId/schedules` 只返回该火车班次 | P0 |
| TC2.3-API-05 | 查询不存在火车的班次列表 | L2 API自动化 | Vitest + Supertest | 无效 trainId 返回业务错误 | P0 |
| TC2.3-API-06 | 未登录不可查询班次列表 | L2 API自动化 | Vitest + Supertest | 不带 Token 返回 401 | P0 |
| TC2.3-API-07 | 非火车管理员不可创建班次 | L2 API自动化 | Vitest + Supertest | 无 MANAGE_TRAIN 权限返回 403 | P0 |
| TC2.3-API-08 | 非火车管理员不可变更班次状态 | L2 API自动化 | Vitest + Supertest | 无 MANAGE_TRAIN 权限返回 403 | P0 |

### 2.2 前端功能测试（L3 Playwright）

| 案例编号 | 测试目的 | 测试方式 | 测试工具 | 覆盖逻辑 | 优先级 |
|---------|---------|---------|---------|---------|-------|
| TC2.3-FE-01 | 进入班次列表页默认加载全局班次 | L3 Playwright | Playwright | 访问 `/schedules` → 表格展示 + 分页器显示 | P0 |
| TC2.3-FE-02 | 火车下拉加载 | L3 Playwright | Playwright | 下拉框可展开 + 展示火车列表 | P0 |
| TC2.3-FE-03 | 切换所属火车刷新班次列表 | L3 Playwright | Playwright | 选择火车 A → 只显示火车 A 班次 | P0 |
| TC2.3-FE-04 | 清空所属火车恢复全局列表 | L3 Playwright | Playwright | 清空选择 → 恢复全部班次 + 分页恢复 | P1 |
| TC2.3-FE-05 | 班次列表字段展示 | L3 Playwright | Playwright | 表格列：名称/状态/开始日期/结束日期/纳版截止/投产日/搭载系统/已纳版/创建时间 | P0 |
| TC2.3-FE-06 | 点击班次行进入详情页 | L3 Playwright | Playwright | 点击行 → 跳转 `/trains/:trainId/schedules/:scheduleId` | P0 |
| TC2.3-FE-07 | 未选择火车时不可新增班次 | L3 Playwright | Playwright | 未选火车时点击新增 → 提示"请先选择所属火车" | P0 |
| TC2.3-FE-08 | 选择火车后可以打开新增班次弹窗 | L3 Playwright | Playwright | 选择火车 → 点击新增 → 弹窗打开 | P0 |
| TC2.3-FE-09 | 编辑班次弹窗 | L3 Playwright | Playwright | 点击编辑 → 弹窗打开 + 字段回填 | P1 |
| TC2.3-FE-10 | 计划中班次显示开始操作 | L3 Playwright | Playwright | PLANNING 状态显示"开始"/"取消"/"编辑"按钮 | P0 |
| TC2.3-FE-11 | 进行中班次显示封板操作 | L3 Playwright | Playwright | IN_PROGRESS 状态显示"封板"/"取消"/"编辑"按钮 | P0 |
| TC2.3-FE-12 | 封板班次显示投产操作 | L3 Playwright | Playwright | LOCKED_DOWN 状态显示"投产"/"取消"/"编辑"按钮 | P0 |

### 2.3 差距验证测试

| 案例编号 | 测试目的 | 当前状态 | 期望状态 | 建议处理 |
|---------|---------|---------|---------|---------|
| TC2.3-GAP-01 | 班次列表未展示"所属火车"列 | 后端返回 trainName，前端表格未展示 | 表格展示"所属火车"列 | P2 待优化 |
| TC2.3-GAP-02 | 按火车查询班次不支持后端分页 | `GET /api/trains/:trainId/schedules` 无分页参数，返回全部 | 支持 page/pageSize，返回 pagination | 建议补充实现 |
| TC2.3-GAP-03 | 前端操作按钮未按角色隐藏 | 所有按钮对所有角色可见 | 按角色显隐（编辑/取消等） | 建议补充实现 |

---

## 三、L2 API 覆盖点映射

### 3.1 接口与函数映射

| 接口 | Service 函数 | 关键逻辑 |
|------|-------------|---------|
| `GET /api/schedules` | `listAllSchedules` | 分页 + 倒序 + 关联查询 |
| `GET /api/trains/:trainId/schedules` | `listTrainSchedules` | 火车存在校验 + 列表返回 |
| `POST /api/trains/:trainId/schedules` | `createTrainSchedule` | 日期校验 + 状态机 |
| `PUT /api/trains/:trainId/schedules/:scheduleId` | `updateTrainSchedule` | 版本控制 + 关键日期更新 |
| `DELETE /api/trains/:trainId/schedules/:scheduleId` | `cancelTrainSchedule` | 取消校验 |
| `POST /api/trains/:trainId/schedules/:scheduleId/status` | `updateTrainScheduleStatus` | 状态流转校验 + 关联需求更新 |

### 3.2 状态流转覆盖

```
PLANNING → IN_PROGRESS → LOCKED_DOWN → RELEASED
   ↓            ↓             ↓
  开始       封板         投产
```

| 状态变更 | API 覆盖 | 前端覆盖 |
|---------|---------|---------|
| PLANNING → IN_PROGRESS | TC2.3-API-08 | TC2.3-FE-10 |
| IN_PROGRESS → LOCKED_DOWN | TC2.3-API-08 | TC2.3-FE-11 |
| LOCKED_DOWN → RELEASED | TC2.3-API-08 | TC2.3-FE-12 |

---

## 四、实现检查清单

### L2 API 自动化
- [ ] TC2.3-API-01: 全局班次列表查询
- [ ] TC2.3-API-02: 分页参数验证
- [ ] TC2.3-API-03: 排序验证
- [ ] TC2.3-API-04: 指定火车列表
- [ ] TC2.3-API-05: 异常 trainId
- [ ] TC2.3-API-06: 未登录认证
- [ ] TC2.3-API-07: 创建权限校验
- [ ] TC2.3-API-08: 状态变更权限校验

### L3 Playwright
- [ ] TC2.3-FE-01: 默认加载全局班次
- [ ] TC2.3-FE-02: 火车下拉加载
- [ ] TC2.3-FE-03: 切换火车刷新
- [ ] TC2.3-FE-04: 清空恢复全局
- [ ] TC2.3-FE-05: 字段展示
- [ ] TC2.3-FE-06: 详情页跳转
- [ ] TC2.3-FE-07: 未选火车不可新增
- [ ] TC2.3-FE-08: 选火车后可新增
- [ ] TC2.3-FE-09: 编辑弹窗
- [ ] TC2.3-FE-10: 计划中状态按钮
- [ ] TC2.3-FE-11: 进行中状态按钮
- [ ] TC2.3-FE-12: 封板状态按钮

### 差距验证（可选）
- [ ] TC2.3-GAP-01: 所属火车列
- [ ] TC2.3-GAP-02: 分页支持
- [ ] TC2.3-GAP-03: 角色按钮显隐
