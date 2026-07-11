# test-strategy-planner 飞书 MCP 配置

本说明用于让 `test-strategy-planner` 通过飞书 MCP 读取 Docx/Wiki、发布已自检报告、查询确认人，并创建"自测策略确认"任务或审批实例。

## 1. 飞书应用配置

在飞书开发者后台为自建应用配置重定向 URL：

```text
http://localhost:3000/callback
```

在应用权限中一次性开通 [lark-document-source.md](lark-document-source.md) 的"统一授权范围"。其中审批相关的 `approval:*` 为 tenant scope；其他 scope 由 OAuth 用户授权。

## 2. 前置依赖

- **Node.js >= v20**：必须全局安装并加入系统 PATH。安装后新开的 PowerShell 中 `node -v` 和 `npx -v` 均能输出版本号。
- **Windows 环境变量**：将 `LARK_APP_ID` 和 `LARK_APP_SECRET` 配置为当前 Windows 用户环境变量。不要把它们写进仓库、Markdown 文档或对话内容。

## 3. TRAE Work MCP 配置

配置文件路径：`C:\Users\Administrator\AppData\Roaming\TRAE SOLO CN\User\mcp.json`

在 TRAE Work 中 **设置 > MCP > 手动添加**，填入以下 JSON：

```json
{
  "mcpServers": {
    "lark-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@larksuiteoapi/lark-mcp",
        "mcp",
        "-a",
        "<your_app_id>",
        "-s",
        "<your_app_secret>",
        "--oauth",
        "--token-mode",
        "user_access_token",
        "--tool-name-case",
        "snake",
        "--language",
        "zh"
      ]
    }
  }
}
```

将 `<your_app_id>` 和 `<your_app_secret>` 替换为你的飞书应用凭证。

### 3.1 TRAE Work OAuth 授权

在 PowerShell 中运行（60 秒内完成浏览器授权）：

```powershell
npx -y @larksuiteoapi/lark-mcp login -a "<your_app_id>" -s "<your_app_secret>"
```

授权成功后 **重启 TRAE Work**，MCP 即可正常加载 user token。

令牌失效或出现 `user_access_token is invalid or expired` 时，重新运行上述 login 命令。

## 4. Codex MCP 配置

`C:\Users\Administrator\.codex\config.toml` 应包含：

```toml
[mcp_servers.lark]
command = 'C:\\Users\\Administrator\\AppData\\Local\\Programs\\nodejs\\node-v26.5.0-win-x64\\node.exe'
args = ['E:\\CodexTest\\trainMVP\\.agents\\skills\\test-strategy-planner\\references\\run-lark-mcp.mjs']
env_vars = ['LARK_APP_ID', 'LARK_APP_SECRET']
startup_timeout_sec = 120
```

### 4.1 Codex 一键授权或重新授权

在 PowerShell 运行：

```powershell
& "E:\CodexTest\trainMVP\.agents\skills\test-strategy-planner\references\login-test-strategy-planner.cmd"
```

脚本会打开浏览器完成 OAuth，并让本地 Lark MCP 保存用户令牌。令牌失效、scope 变更或出现 `user_access_token is invalid or expired` 时，重新运行此命令。

## 5. 验证

重启 TRAE Work 或 Codex 后，执行一个只读的 Docx/Wiki 搜索或用户搜索。成功返回结果即表示 MCP、用户 OAuth 和最小 scope 可用；不要用创建文档、发送任务或创建审批实例作为首次验证。

## 6. 当前 MCP 工具能力

权限齐全不代表 MCP 一定已暴露 API 工具。执行发布、用户查询、任务或审批前，先检查当前会话暴露的 Lark MCP tool schema；没有对应工具时，说明"当前 MCP 未暴露该能力"，不要伪造创建结果。

## 7. 常见问题

| 问题 | 原因 | 解决方法 |
|------|------|----------|
| `'npx' 不是内部或外部命令` | Node.js 未全局安装或未加入 PATH | 安装 Node.js >= v20，安装时勾选 "Add to PATH"，安装后重启 TRAE |
| `userToken must be provided` | 未完成 OAuth 授权或 token 已过期 | 运行对应平台的 login 命令重新授权 |
| `Login failed` / 超时 | 浏览器授权未在 60 秒内完成 | 重新运行 login 命令，拿到 URL 后立即在浏览器中打开 |
| 授权成功但仍报错 | 不同平台使用不同的 MCP 包和 token 存储 | TRAE Work 用 `@larksuiteoapi/lark-mcp`，Codex 用 `run-lark-mcp.mjs`，两套独立授权 |
| `npm cache` 报错 | npm 本地缓存异常 | 运行 `npm cache clean --force`，然后重启 TRAE |
