# AI解释与建议确认页面

Status: ready-for-agent
Type: AFK

## What to build

实现 AI排期建议页面和解释能力。页面展示建议纳入、建议延期、依赖风险、容量变化和总结说明，火车管理员可以勾选部分或全部建议并批量确认纳版。

## Acceptance criteria

- [ ] 页面分区展示建议纳入、建议延期、风险原因和容量变化。
- [ ] AI只生成解释和总结，不改变规则引擎输出的建议结果。
- [ ] AI不可用时仍展示规则引擎基础建议。
- [ ] 火车管理员可勾选建议项并批量确认纳版。
- [ ] 批量确认纳版仍经过纳版命令、权限、状态机和审计校验。

## Blocked by

- 16-ai-scheduling-rule-engine.md

## Comments

