# unit-test-governance 使用说明

本 skill 作为前端和后端代码变更的统一单测门禁，检查增量覆盖率（>80%）和单测通过率（100%）。

## 用途与边界

| 负责 | 不负责 |
|---|---|
| 确认代码范围和 L1 策略案例 | 运行 API、集成、E2E 或人工验证 |
| 执行单测并计算增量覆盖率 | 用 L2/L3/M 抵扣后端 L1 门禁 |
| 判断变更逻辑是否需要单测覆盖 | 将 API/E2E 测试计入单测门禁 |
| 自动补齐缺失单测（可选） | 替代 `test-strategy-planner` 或 `test-report-generator` |
| 生成单测治理报告并给出最终决策 | 在报告中写入后续 skill 建议 |

## 硬性门禁

### 后端单测门禁

后端 L1 是默认硬门禁：

```text
后端增量单测覆盖率 > 80%
后端单测通过率 = 100%
```

必须单独展示，且不能被 L2/L3/人工验证抵扣。

### 前端单测口径

前端不默认要求单测覆盖率门禁。建议只在以下情况补前端单测：
- 表单校验、字段格式化
- 权限显隐、按钮状态
- 分页、排序、筛选
- React hook、Vue composable
- 工具函数、状态管理

## 执行流程

```
输入确认 → 识别变更代码 → 搜索已有单测 → 检查L1策略案例覆盖 → 运行单测 → 计算覆盖率 → 生成分析版报告 → 自动补齐(可选) → 更新最终版报告
```

## 使用方式

### 触发命令

```
Use Skill: unit-test-governance
```

或提供测试策略报告路径：

```
"reports/test-strategy/ST-T2-US2.3-测试策略_v1.1_20260713.md" 用 Use Skill: unit-test-governance 执行单测门禁检查
```

### 输入确认

正式分析前必须确认：
- 代码范围（分支、commit range、文件列表或测试策略报告）
- 测试文件列表
- L1 策略案例（从测试策略报告提取）
- 自动补齐开关

## 自动补齐（可选）

用户确认后，自动生成候选单测并写入测试文件：
- 状态流转、权限判断、参数校验
- 计算、转换、映射、排序、分页
- 幂等、重试、降级、缓存

## 输出产物

| 产物 | 路径 |
|---|---|
| 单测治理报告（分析版/最终版） | `reports/unit-test-governance/ST-{scope}-单测治理_v{version}_{date}.md` |

## 报告结构（强制）

1. 单测门禁摘要
2. 已有测试证据
3. L1 策略案例覆盖检查
4. 变更逻辑覆盖分类
5. 自测检查点 L1 覆盖现状
6. 需补充单测清单
7. 未覆盖或排除风险
8. 单测执行证据
9. 最终决策

## 最终决策规则

| 决策 | 含义 |
|---|---|
| 通过 | 增量覆盖率大于 80%，单测通过率 100% |
| 不通过 | 覆盖率低于或等于 80%，通过率不是 100%，或存在高风险未覆盖逻辑 |
| 阻塞 | 缺少必要覆盖率或测试结果数据，且无法推断 |

## 飞书发布

报告完成"最终版"更新和输出自检后，可询问用户是否：
- 创建飞书文档
- 创建"单测门禁确认"审批任务
- 指定审批人

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
| `SKILL.md` | skill 完整定义和门禁规则 |
| `references/coverage-rules.md` | 增量覆盖率计算规则 |
| `references/risk-classification.md` | 未覆盖风险分级 |
| `references/unit-test-assertion-guidelines.md` | 有效断言和弱断言审查规范 |
| `references/output-template.md` | 中文报告模板 |
| `references/lark-document-source.md` | 飞书文档来源与权限配置 |