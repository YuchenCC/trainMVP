---
name: git-push-notice
description: Git 提交推送后发送飞书通知。支持群通知（commit and push）和私信通知（/push-notice 人名）。
argument-hint: "commit and push 或 /push-notice 人名"
---

# Git Push Notice — 飞书通知

通过 lark-cli 发送飞书通知，支持两种模式：
1. **群通知模式**：`commit and push` — 提交代码后发飞书群通知
2. **私信模式**：`push-notice 人名` — 搜索联系人并发送私信通知

## When to Use

### 群通知（commit and push）
- After completing code changes
- User says "commit and push" / "commit push" / "提交并推送"
- 用户说 "提交并推送" / "提交代码" / "commit"
- Ready to share progress with team

### 私信通知（push-notice）
- User says `/push-notice 铁胆` — 给"铁胆"发私信通知
- User says `/push-notice 张三 李四` — 给多个人发私信通知
- User says `通知铁胆 代码已推送` — 同上

## Prerequisites

### Required: lark-cli installed and authenticated

```bash
# Install (if not already installed)
npx @larksuite/cli@latest install

# Check auth status
lark-cli auth status
```

If not authenticated, run:
```bash
lark-cli config init --new
lark-cli auth login --recommend
lark-cli auth login --scope "im:message.send_as_user"
```

### Required Configuration

Create `.agents/feishu-config.json` in project root:

```json
{
  "chatId": "oc_xxxxxxxxxxxx",
  "mentions": [],
  "projectName": "版本火车需求管理系统",
  "repoUrl": "https://github.com/your-org/your-repo"
}
```

**Fields:**
- `chatId` — Feishu group chat ID (use `lark-cli im +chat-list` to list groups)
- `mentions` — Array of user IDs to @mention (ou_xxx format, empty array `[]` if none)
- `projectName` — Project display name
- `repoUrl` — Repository URL (optional, for commit link)

---

## Mode 1: 群通知（commit and push）

### Step 1: Analyze Changes

```bash
git branch --show-current
git diff --stat
git diff --cached --stat
git status --porcelain
```

### Step 2: Generate Commit Message

**要求：commit message 必须使用中文**

Follow Conventional Commits format:

```
<type>(<scope>): <中文主题>

<中文正文>
```

**Types:** feat / fix / docs / refactor / test / perf / build / ci / chore

**示例：**
- `feat(需求池): 添加需求导入功能`
- `fix(仪表盘): 修复日历视图显示错误`
- `docs(用户手册): 更新部署说明`

### Step 3: Ask for Confirmation

Show the user:
- Commit type, scope, subject, body
- Files to be committed
- Ask: "确认提交并推送到远程吗？"

### Step 4: Execute Commit & Push

```bash
git add -A
git commit -m "type(scope): 中文主题

中文正文"
git push origin $(git branch --show-current)
```

### Step 5: Send Feishu Group Notification

Read `.agents/feishu-config.json` to get `chatId`, `projectName`, `repoUrl`.

```bash
# Get commit info
BRANCH=$(git branch --show-current)
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=format:"%s")
FILES=$(git diff --stat HEAD~1 HEAD | tail -1)

# Send card message to group
lark-cli im +messages-send \
  --chat-id "$CHAT_ID" \
  --msg-type "interactive" \
  --card '{
    "config": {"wide_screen_mode": true},
    "header": {
      "title": {"content": "📦 代码已提交推送", "tag": "plain_text"},
      "template": "blue"
    },
    "elements": [
      {
        "tag": "div",
        "text": {
          "content": "**项目:** PROJECT_NAME\n**分支:** BRANCH\n**提交:** `COMMIT_HASH`\n**消息:** COMMIT_MESSAGE",
          "tag": "lark_md"
        }
      },
      {
        "tag": "hr"
      },
      {
        "tag": "div",
        "text": {
          "content": "**变更文件:**\nFILES_LIST",
          "tag": "lark_md"
        }
      },
      {
        "tag": "action",
        "actions": [
          {
            "tag": "button",
            "text": {"content": "查看提交", "tag": "plain_text"},
            "type": "primary",
            "url": "COMMIT_URL"
          }
        ]
      },
      {
        "tag": "note",
        "elements": [
          {"tag": "plain_text", "content": "由 AI 助手自动通知"}
        ]
      }
    ]
  }'
```

**Simplified text message** (if card format fails):

```bash
lark-cli im +messages-send \
  --chat-id "$CHAT_ID" \
  --text "📦 代码已提交推送
项目: PROJECT_NAME
分支: BRANCH
提交: COMMIT_HASH
消息: COMMIT_MESSAGE
变更: FILES_LIST"
```

---

## Mode 2: 私信通知（push-notice 人名）

### Trigger

User says: `/push-notice 铁胆` or `通知铁胆 代码已推送`

### Step 1: Parse recipient names

从用户输入中提取人名，支持多个：
- `/push-notice 铁胆` → ["铁胆"]
- `/push-notice 铁胆 张三` → ["铁胆", "张三"]

### Step 2: Search contacts

对每个人名调用 lark-cli 搜索：

```bash
# 搜索联系人
lark-cli contact +search-user --query "铁胆" --format json
```

返回结果中提取 `open_id` 字段。

**重要**：
- 如果搜索不到该联系人，告知用户并跳过
- 如果搜到多个同名联系人，列出所有结果让用户选择
- 只取第一个匹配结果（`open_id`）

### Step 3: Build message content

根据上下文构建通知内容：
- 如果刚完成 git push，使用提交信息
- 如果是独立通知命令，使用用户提供的消息内容（或默认提示）

```bash
# 发送私信
lark-cli im +messages-send \
  --user-id "$OPEN_ID" \
  --text "📦 代码已提交推送
项目: PROJECT_NAME
分支: BRANCH
提交: COMMIT_HASH
消息: COMMIT_MESSAGE
变更: FILES_LIST"
```

### Step 4: Confirm result

告知用户发送结果：
```
✅ 已向 铁胆 发送私信通知
❌ 未找到联系人: 张三（跳过）
```

---

## Example Output

### Mode 1: 群通知卡片
```
┌─────────────────────────────────────┐
│ 📦 代码已提交推送                    │
├─────────────────────────────────────┤
│ 项目: 版本火车需求管理系统            │
│ 分支: main                          │
│ 提交: a1b2c3d                       │
│ 消息: feat(requirements): add...     │
├─────────────────────────────────────┤
│ 变更文件:                            │
│ • src/modules/requirements/service.ts │
│ • src/modules/requirements/ctrl.ts    │
├─────────────────────────────────────┤
│ [查看提交]                           │
│         由 AI 助手自动通知             │
└─────────────────────────────────────┘
```

### Mode 2: 私信通知
```
用户: /push-notice 铁胆
AI:   ✅ 已向 铁胆 发送私信通知
```

---

## Error Handling

### No Changes to Commit
```
Nothing to commit. Working tree clean.
```

### Push Failed
```
Push failed: {error_message}
Retry? (y/n)
```

### Contact Not Found
```
❌ 未找到联系人: {name}
请确认姓名是否正确，或使用 lark-cli contact +search-user --query "姓名" 手动搜索
```

### Feishu Notification Failed
```
Warning: Feishu notification failed, but commit was successful.
Error: {error_message}
Tip: Run `lark-cli auth status` to check permissions.
```

### lark-cli Not Installed
```
lark-cli not found. Install with: npx @larksuite/cli@latest install
```

## Composability

This skill combines:
- **git-commit** - Commit with conventional message (Mode 1)
- **git-push** - Push to remote (Mode 1)
- **lark-cli contact** - Search contacts by name (Mode 2)
- **lark-cli im** - Send group/private notification via Feishu CLI

For commit-only (no push): use `git-commit` skill instead.
