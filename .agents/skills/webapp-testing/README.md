# webapp-testing 使用说明

本 skill 使用 Playwright 测试本地 Web 应用，支持验证前端功能、调试 UI 行为、捕获截图、查看浏览器日志。

## 用途与边界

| 负责 | 不负责 |
|---|---|
| 使用 Playwright 执行 UI 自动化测试 | 运行单测或 API 测试 |
| 捕获页面截图和控制台日志 | 判定单测门禁 |
| 验证用户旅程和交互流程 | 生成最终自测报告 |

## 决策树

```
用户任务 → 是静态HTML?
    ├─ 是 → 直接读取HTML文件识别选择器 → 编写Playwright脚本
    │
    └─ 否(动态Web应用) → 服务器已运行?
        ├─ 否 → 使用 with_server.py 启动服务器 → 编写Playwright脚本
        │
        └─ 是 → 侦察-行动模式:
            1. 导航并等待 networkidle
            2. 截图或检查DOM
            3. 从渲染状态识别选择器
            4. 使用发现的选择器执行操作
```

## 使用方式

### 触发命令

```
Use Skill: webapp-testing
```

### 启动服务器

使用 `scripts/with_server.py` 管理服务器生命周期：

**单服务器：**
```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_automation.py
```

**多服务器（后端 + 前端）：**
```bash
python scripts/with_server.py \
  --server "cd release-train/apps/server && pnpm dev" --port 3000 \
  --server "cd release-train/apps/web && pnpm dev" --port 5173 \
  -- python your_automation.py
```

### Playwright 脚本模板

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    
    # 执行自动化逻辑
    page.locator('text=班次列表').click()
    page.locator('select[name="train"]').select_option('火车A')
    page.screenshot(path='/tmp/schedule_list.png', full_page=True)
    
    browser.close()
```

## 最佳实践

- 使用 `sync_playwright()` 同步模式
- 动态应用必须先等待 `networkidle` 再检查 DOM
- 使用描述性选择器：`text=`、`role=`、CSS 选择器或 ID
- 完成后关闭浏览器
- 使用 `page.wait_for_selector()` 或 `page.wait_for_timeout()` 添加适当等待

## 示例脚本

**元素发现：**
```python
# examples/element_discovery.py - 发现页面上的按钮、链接和输入框
```

**静态 HTML 自动化：**
```python
# examples/static_html_automation.py - 使用 file:// URL 测试本地 HTML
```

**控制台日志捕获：**
```python
# examples/console_logging.py - 自动化过程中捕获控制台日志
```

## 输出产物

| 产物 | 路径 |
|---|---|
| Playwright 测试脚本 | `tests/e2e/` 或自定义目录 |
| 测试截图 | `test-results/**/*.png` |
| Playwright HTML 报告 | `playwright-report/index.html` |

## 常见问题

| 问题 | 原因 | 解决方法 |
|---|---|---|
| 找不到元素 | 动态页面未等待 `networkidle` | 添加 `page.wait_for_load_state('networkidle')` |
| 页面加载超时 | 服务器未启动或端口错误 | 使用 `with_server.py` 确保服务器就绪 |
| 截图为空或不完整 | 页面未完全渲染 | 使用 `full_page=True` 或添加等待时间 |

## 与其他技能的协作关系

```
test-strategy-planner (制定策略)
       ↓
unit-test-governance (单测门禁)
       ↓
automating-api-testing (L2 API测试)
webapp-testing (L3 UI测试)
       ↓
test-report-generator (汇总报告)
```

完整流程说明请参考：`../SKILL使用手册.md`

## Reference 文件

| 文件 | 用途 |
|---|---|
| `SKILL.md` | skill 完整定义和测试规范 |
| `scripts/with_server.py` | 服务器生命周期管理脚本 |
| `examples/element_discovery.py` | 元素发现示例 |
| `examples/static_html_automation.py` | 静态 HTML 自动化示例 |
| `examples/console_logging.py` | 控制台日志捕获示例 |