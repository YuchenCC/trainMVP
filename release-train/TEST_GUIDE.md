# 版本火车页面路由测试文档

## 路由结构

```
/                              → 重定向到 /trains（班次列表）
/login                        → 登录页
/requirements                 → 需求列表
/trains                       → 班次列表（默认页面）⭐
/trains/list                  → 火车列表
/trains/new                   → 创建火车
/trains/:id                  → 火车详情
/trains/:id/edit             → 编辑火车
/trains/:trainId/schedules/:scheduleId → 班次详情
```

## 页面导航

### 1. 默认进入
用户登录后自动跳转到 `/trains`，显示**班次列表**页面。

### 2. 班次列表页面
- 路径：`/trains`
- 组件：`SchedulesPage`
- 顶部按钮：
  - **班次列表**（当前页面，高亮）
  - **火车列表**（点击跳转到 `/trains/list`）

### 3. 火车列表页面
- 路径：`/trains/list`
- 组件：`TrainsPage`
- 顶部按钮：
  - **火车列表**（当前页面，高亮）
  - **班次列表**（点击跳转到 `/trains`）

## 测试步骤

1. **启动应用**
   ```bash
   pnpm dev:server  # 后端
   pnpm dev:web    # 前端
   ```

2. **访问应用**
   打开浏览器访问前端地址

3. **验证默认页面**
   - 登录后应该直接看到**班次列表**页面
   - URL 应该显示 `/trains`

4. **测试页面切换**
   - 点击"火车列表"按钮 → URL 变为 `/trains/list` → 显示火车列表
   - 点击"班次列表"按钮 → URL 变为 `/trains` → 显示班次列表

## 关键代码

### App.tsx 路由配置
```tsx
<Route path="/trains" element={<SchedulesPage />} />
<Route path="/trains/list" element={<TrainsPage />} />
<Route index element={<Navigate to="/trains" replace />} />
```

### 班次列表页面按钮
```tsx
<Button icon={<CalendarOutlined />} onClick={() => navigate('/trains')}>
  班次列表
</Button>
<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/trains/list')}>
  火车列表
</Button>
```

## 预期效果

1. ✅ 点击"版本火车"菜单进入班次列表
2. ✅ 班次列表显示所有班次，可按火车筛选
3. ✅ 点击"火车列表"按钮跳转到火车列表
4. ✅ 火车列表显示所有火车
5. ✅ 点击"班次列表"按钮返回班次列表
