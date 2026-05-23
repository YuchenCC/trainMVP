# 版本火车页面路由测试文档

## 路由结构

```
/dashboard                                  → 仪表盘（首页）⭐
/login                                      → 登录页
/requirements                               → 需求列表
/schedules                                  → 班次列表
/trains                                     → 火车列表
/trains/new                                 → 创建火车
/trains/:id                                 → 火车详情
/trains/:id/edit                            → 编辑火车
/trains/:trainId/schedules/:scheduleId      → 班次详情
```

## 页面导航

### 1. 默认进入
用户登录后自动跳转到 `/dashboard`，显示**仪表盘**页面。

### 2. 左侧导航栏
- **版本火车** → 跳转 `/schedules`（班次列表）

### 3. 班次列表页面
- 路径：`/schedules`
- 组件：`SchedulesPage`
- 顶部按钮：
  - **班次列表**（当前页面）
  - **火车列表**（点击跳转到 `/trains`）

### 4. 火车列表页面
- 路径：`/trains`
- 组件：`TrainsPage`
- 顶部按钮：
  - **火车列表**（当前页面）
  - **班次列表**（点击跳转到 `/schedules`）

## 测试步骤

## 启动命令

> 使用 `dev.sh` 脚本管理服务

项目根目录：`release-train/`

```bash
# 首次使用需给脚本添加执行权限
chmod +x dev.sh

# 启动全部服务（shared + server + web）
bash dev.sh start

# 查看服务状态
bash dev.sh status

# 重启全部服务
bash dev.sh restart

# 停止全部服务
bash dev.sh stop

# 单独操作
bash dev.sh start:server   # 仅启动后端
bash dev.sh start:web      # 仅启动前端
bash dev.sh stop:server    # 仅停止后端
bash dev.sh stop:web       # 仅停止前端
```

**端口：** 后端 `3000` / 前端 `5173` &nbsp;&nbsp;|&nbsp;&nbsp; **日志：** `server.log` / `web.log`

---

**数据库操作**（在 `apps/server` 目录下）：

```bash
npx prisma db push          # 推送 schema 到数据库
npx prisma generate          # 重新生成 Prisma Client
npx prisma studio            # 打开数据库管理界面
```

2. **访问应用**
   打开浏览器访问前端地址

3. **验证默认页面**
   - 登录后应该直接看到**仪表盘**页面
   - URL 应该显示 `/dashboard`

4. **测试左侧导航**
   - 点击左侧"版本火车"菜单 → URL 变为 `/schedules` → 显示班次列表

5. **测试页面切换**
   - 点击"火车列表"按钮 → URL 变为 `/trains` → 显示火车列表
   - 点击"班次列表"按钮 → URL 变为 `/schedules` → 显示班次列表

## 关键代码

### App.tsx 路由配置
```tsx
<Route path="/dashboard" element={<DashboardPage />} />
<Route path="/schedules" element={<SchedulesPage />} />
<Route path="/trains" element={<TrainsPage />} />
<Route path="*" element={<Navigate to="/dashboard" replace />} />
```

### 左侧导航栏菜单
```tsx
{
  key: '/schedules',
  icon: <CarOutlined />,
  label: '版本火车',
},
```

### 火车列表页面按钮
```tsx
<Button icon={<CalendarOutlined />} onClick={() => navigate('/schedules')}>
  班次列表
</Button>
```

### 班次列表页面按钮
```tsx
<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/trains')}>
  返回火车列表
</Button>
```

## 预期效果

1. ✅ 登录后跳转到仪表盘 `/dashboard`
2. ✅ 点击"版本火车"菜单进入班次列表 `/schedules`
3. ✅ 班次列表显示所有班次，可按火车筛选
4. ✅ 点击"火车列表"按钮跳转到火车列表 `/trains`
5. ✅ 火车列表显示所有火车
6. ✅ 点击"班次列表"按钮返回班次列表 `/schedules`
