# Git Commit & Push with Feishu Notification

Commit changes, push to remote, and send Feishu notification to stakeholders.

## When to Use

- After completing code changes
- User says "commit and push" / "commit push" / "提交并推送"
- Ready to share progress with team

## Prerequisites

### Required Configuration

Create `.agents/feishu-config.json` in project root:

```json
{
  "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-id",
  "mentions": ["user_id_1", "user_id_2"],
  "projectName": "版本火车需求管理系统"
}
```

### Getting Feishu Webhook

1. Open Feishu group → Settings → Group Bots → Add Bot
2. Select "Custom Bot"
3. Copy the webhook URL
4. (Optional) Add keyword for security

### Getting User IDs for @mentions

Use Feishu user ID (ou_xxx format) from user profile URL or API.

## Workflow

### Step 1: Analyze Changes

```bash
# Check current branch
git branch --show-current

# View unstaged changes
git diff --stat

# View staged changes
git diff --cached --stat

# List all changed files
git status --porcelain
```

### Step 2: Generate Commit Message

Follow Conventional Commits format:

```
<type>(<scope>): <subject>

<body>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code restructuring
- `test` - Adding tests
- `perf` - Performance improvement
- `build` - Build system
- `ci` - CI configuration
- `chore` - Maintenance

### Step 3: Ask for Confirmation

Show the user:
- Commit type and scope
- Commit subject and body
- Files to be committed
- Ask: "确认提交并推送到远程吗？"

### Step 4: Execute Commit & Push

```bash
# Stage all changes
git add -A

# Commit with message
git commit -m "type(scope): subject

body"

# Push to remote
git push origin $(git branch --show-current)
```

### Step 5: Send Feishu Notification

Build and send interactive card message:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "msg_type": "interactive",
    "card": {
      "config": {"wide_screen_mode": true},
      "header": {
        "title": {"content": "📦 代码已提交推送", "tag": "plain_text"},
        "template": "blue"
      },
      "elements": [
        {
          "tag": "div",
          "text": {
            "content": "**项目:** {projectName}\n**分支:** {branch}\n**提交:** `{commitHash}`\n**消息:** {commitMessage}",
            "tag": "lark_md"
          }
        },
        {
          "tag": "hr"
        },
        {
          "tag": "div",
          "text": {
            "content": "**变更文件:**\n{filesList}",
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
              "url": "{commitUrl}"
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
    }
  }' \
  {FEISHU_WEBHOOK_URL}
```

## Example Output

### Confirmation Prompt
```
📝 即将执行以下操作：

类型: feat(requirements)
分支: main
提交消息: feat(requirements): add batch import capability

变更文件:
  M src/modules/requirements/service.ts
  M src/modules/requirements/controller.ts
  A tests/requirements/batch.test.ts

确认提交并推送到远程吗？ (y/n)
```

### Feishu Notification Card
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
└─────────────────────────────────────┘
```

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

### Feishu Notification Failed
```
Warning: Feishu notification failed, but commit was successful.
Error: {error_message}
```

## Composability

This skill combines:
- **git-commit** - Commit with conventional message
- **git-push** - Push to remote
- **Feishu notify** - Send team notification

For commit-only (no push): use `git-commit` skill instead.
