# 飞书云文档与 Wiki 来源规则

## 使用时机

当用户提供飞书云文档/Wiki 链接、文档 token、搜索关键词，或明确要求从飞书读取需求、设计、测试案例时，使用本规则。

## 前置门禁

1. 先确认当前会话存在 `lark` MCP 工具。
2. 输入确认前，只搜索候选并读取标题、链接、类型、更新时间等元数据；不要生成覆盖结论。
3. 用户明确要求查找飞书文件、提供飞书文件夹名称或给出飞书链接时，先只搜索飞书来源；未经用户允许，不执行本地目录搜索、本地同名文件搜索或本地内容读取。
4. 将已搜索到的飞书候选放入“分析前输入确认清单”，等待用户确认纳入范围。
5. 用户确认后，才读取已确认文档正文并进入正式分析。
6. 默认只读。除非用户明确要求并确认写入目标，不创建、编辑、移动、删除或修改飞书权限。

## 工具映射

| 目标 | MCP 工具 | 使用规则 |
|---|---|---|
| 搜索当前用户可见的云文档 | `docx_builtin_search` | 使用关键词获取候选；搜索命中不等于已读取正文 |
| 搜索云空间中的文件夹或文件 | 当前会话若暴露 `drive` 文件/文件夹搜索工具则优先使用；否则使用 `docx_builtin_search` 做名称候选搜索 | 文件夹名先作为搜索关键词；拿到 folder/token 后再限定范围递归搜索；没有对应工具时标记“当前 MCP 未暴露云空间文件夹搜索能力”，不改搜本地 |
| 读取新版文档正文 | `docx_v1_document_rawContent` | 使用 Docx `document_id` 读取纯文本正文 |
| 搜索知识库节点 | `wiki_v1_node_search` | 使用关键词或空间范围获取 Wiki 候选 |
| 解析 Wiki 节点 | `wiki_v2_space_getNode` | 使用 Wiki token 获取节点类型和目标文档 token，再按目标类型读取正文 |

调用前先查看当前会话暴露的工具 schema，按实际参数名传参；不要凭经验猜测字段。

## 链接与 token 处理

- Docx 链接通常包含 `/docx/{document_id}`，提取 `document_id` 后读取正文。
- Wiki 链接通常包含 `/wiki/{token}`，先解析节点，再使用返回的对象 token 读取正文。
- 搜索结果只有标题或摘要时，标记为“仅候选”，不要写成“已分析来源”。
- 同一文档存在本地导出和飞书在线版本时，优先使用用户明确确认的版本；两者内容冲突时记录口径差异，不自行合并。

## 来源优先级

1. 用户明确确认的具体来源，无论是本地文件还是飞书文档。
2. 已确认的测试案例文档。
3. 已确认的需求、用户故事和详细设计。
4. 用户确认纳入的飞书搜索候选。

## 飞书文件夹名称的处理顺序

当用户只提供一个飞书文件夹名称时：

1. 先用当前会话暴露的云空间/文件搜索工具搜索该名称；如果没有文件夹搜索工具，使用 `docx_builtin_search` 搜索同名文件和可见资源作为候选。
2. 只展示候选名称、类型、链接/token、更新时间和匹配原因，不读取正文，不搜索本地。
3. 用户确认某个文件夹或资源后，再用返回的 folder/token 作为范围，搜索其中的测试案例、需求、设计或其他指定文件。
4. 如果 MCP 只能搜文档、不能解析文件夹层级，明确说明“当前 MCP 未暴露文件夹递归能力”，请求用户提供文件夹链接/token或具体文件名；不要用本地文件夹替代。
5. 未确认候选只能作为索引，不能作为正式结论证据。

## 报告留痕

使用飞书来源时，在主报告“分析范围”中记录：

| 来源类型 | 标题 | 链接或 token | 读取时间 | 读取状态 | 用途 |
|---|---|---|---|---|---|
| 飞书 Docx / 飞书 Wiki |  |  |  | 已读取正文 / 仅候选 / 读取失败 | 测试案例 / 需求 / 设计 / 其他 |

不得把访问令牌、App ID、App Secret、授权码或 MCP 本地配置写入 skill、reference 或生成报告。

## OAuth 最小权限与一键授权

本 skill 使用飞书 MCP 时，优先使用 `user_access_token`。令牌失效时必须重新 OAuth 授权；不要改用长期手工复制的 token，也不要将 token、App ID 或 App Secret 写入报告、skill 或 reference。

### 统一授权范围

以下 scope 是本 skill 使用飞书 MCP 的统一最小集合：

```text
offline_access
docs:doc:readonly
docs:document.content:read
docx:document:readonly
wiki:wiki:readonly
wiki:node:read
wiki:node:retrieve
wiki:space:read
wiki:space:retrieve
docs:document:import
docs:permission.member:create
docs:permission.member:retrieve
contact:user:search
contact:user.id:readonly
contact:user.basic_profile:readonly
task:task:write
task:task:read
approval:instance
approval:approval:readonly
approval:task
```

其中 `approval:instance`、`approval:approval:readonly` 和 `approval:task` 是应用的 tenant scope，由飞书管理员在应用权限配置中批准；其余为 OAuth 用户授权 scope，由一键授权脚本请求。它们共同构成同一套 skill 权限，不是两套功能方案。

| 能力 | 需要的 scope | 说明 |
|---|---|---|
| 搜索和读取 Docx | `docs:doc:readonly`、`docs:document.content:read`、`docx:document:readonly` | 搜索候选并读取已确认正文 |
| 搜索和读取 Wiki | `wiki:wiki:readonly`、`wiki:node:read`、`wiki:node:retrieve`、`wiki:space:read`、`wiki:space:retrieve` | 搜索节点、解析节点并读取正文 |
| 创建飞书文档 | `docs:document:import` | 将已自检的 Markdown 主报告导入为飞书文档 |
| 分享给确认人 | `docs:permission.member:create`、`docs:permission.member:retrieve` | 添加协作者并验证权限结果 |
| 查询确认人 | `contact:user:search`、`contact:user.id:readonly`、`contact:user.basic_profile:readonly` | 查询候选用户并取得 open_id；不需要邮箱时不申请邮箱权限 |
| 创建和验证普通任务 | `task:task:write`、`task:task:read` | 创建“自测策略确认”任务并验证状态 |
| 创建和验证原生审批实例 | `approval:instance`、`approval:approval:readonly`、`approval:task` | 创建审批实例、读取审批定义和验证审批任务状态 |
| 刷新用户授权 | `offline_access` | 允许 OAuth 刷新令牌，降低频繁过期概率 |

### 一键授权

本机使用以下脚本重新获取并保存 OAuth 用户令牌：

```powershell
& "E:\CodexTest\trainMVP\.agents\skills\test-strategy-planner\references\login-test-strategy-planner.cmd"
```

脚本从环境变量 `LARK_APP_ID` 和 `LARK_APP_SECRET` 读取应用凭据，启动本地 OAuth 回调并打开浏览器。飞书开发者后台必须已配置重定向 URL：`http://localhost:3000/callback`。

授权完成后，用一个只读 MCP 调用验证用户令牌；若出现 `user_access_token is invalid or expired`，重新运行上述脚本。不要在 skill 执行过程中打印授权 URL、授权码或令牌。

## 失败降级

- `lark` MCP 工具不可用：报告“飞书 MCP 未加载”，请用户重启 Codex 或提供本地导出文件；不要虚构正文。
- 搜索无结果：列出关键词和搜索范围，请用户提供链接或更准确关键词。
- 权限不足：记录无法访问的链接/token 和错误类型，请用户确认文档分享范围或应用权限。
- Wiki 节点可解析但正文不可读：保留节点元数据并标记“仅候选/读取失败”，不得据此形成覆盖结论。
- 飞书读取失败不影响已确认本地来源的分析，但必须在报告中明确缺失来源及其风险。

## 报告发布与“自测策略确认”任务

只有主报告、附件和人工验证 evidence（如有）完成 `report-output.md` 的输出自检后，才能询问用户是否通过飞书 MCP 发布。输出自检未完成时，不得创建飞书文档或任务。

询问模板：

```markdown
本次文件已生成并完成输出自检。

请确认是否通过飞书 MCP 执行以下操作：
- 创建飞书文档：是 / 否
- 创建“自测策略确认”审批任务：是 / 否
- 审批人：请提供姓名、邮箱或 open_id；随后通过飞书 MCP 查询并确认

默认发布文件：主报告；如需同时发布附件，请一并确认。
```

执行规则：

1. 用户未明确确认前，不创建飞书文档、不创建审批任务、不向任何飞书用户发送内容。
2. 创建文档时，默认发布已完成自检的主报告；附件只有在用户明确确认后才一并创建或关联。
3. 创建任务时，名称固定为“自测策略确认”，内容包含飞书文档链接、分析范围、测试案例来源、主要风险、TODO 和确认要求。
4. 创建任务前，先让用户提供审批人的姓名、邮箱或 open_id；不得先枚举全部可访问用户作为审批人候选。
5. 通过飞书 MCP 的用户目录能力按用户提供的条件查询，展示匹配用户的姓名及可确认身份信息（邮箱或 open_id）。
6. 即使查询仅匹配一个用户，也必须取得最终确认；多个匹配结果时必须让用户明确选择。
7. 查不到用户、身份信息不足、用户无法确认，或 MCP 未暴露文档/用户查询/任务或审批能力时，停止发送并说明阻塞原因。
8. 执行前确认当前飞书 MCP 已获得文档、用户查询和任务/审批所需权限；权限不足时不得声称已创建。
9. 创建完成后，通过飞书 MCP 验证文档链接、任务或审批实例标识、审批人和状态；最终回复分别说明文档和任务的创建结果，失败时记录原因和可重试事项。

普通飞书任务与原生审批实例均可承载“自测策略确认”；优先使用当前会话实际暴露且已授权的能力，不得假设 MCP 已具备某个工具。

## 最终对话中的后续 skill 建议

后续 skill 建议只出现在最终对话，不写入主报告、附件或 TODO 表。建议必须依据当前项目实际存在的 `.agents/skills/*/SKILL.md` 动态生成。

执行步骤：

1. 扫描项目内 skill 的 `name`、`description` 和用途说明。
2. 按后续任务匹配能力：单测治理、后端单测、API/JMeter、前端测试、UI 自动化、人工验证、最终覆盖报告等。
3. 只推荐真实存在的 skill；没有匹配项时说明“项目暂未提供对应 skill”，并给出缺失能力名称。
4. 多个候选时按与本次任务的匹配度排序，并说明原因和输入建议。
5. 不得因历史报告或旧流程出现过某个 skill 名称就默认推荐。

建议输出格式：

| 后续任务 | 推荐 skill | 是否存在 | 推荐原因 | 输入建议 |
|---|---|---|---|---|

## 最终回复约束

报告生成后，最终对话回复保持简短，只包含：

- 报告路径。
- 分析范围。
- 是否发现口径差异。
- 单测门禁策略结论。
- 已覆盖、部分覆盖、缺失的高层结论。
- 输出自检结果。
- 人工验证目录路径（如已创建）。
- 必要的下一步建议及动态 skill 路由。
