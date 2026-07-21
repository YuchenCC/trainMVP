# 单测生成规则

仅在用户确认自动补齐并确认写入范围后使用。本文件约束可自动补齐的范围、Mock 使用和测试命名；有效业务断言仍以 `unit-test-assertion-guidelines.md` 为准。

## 可自动补齐范围

- 状态流转、权限判断、参数校验和异常分支。
- 计算、转换、映射、排序、分页和去重。
- 幂等、重试、降级、缓存和版本冲突等可隔离逻辑。

以下内容不自动伪造为单测，改记为其他层级 TODO：

- 真实数据库事务、多表一致性和执行计划。
- HTTP 契约、鉴权中间件、跨服务或跨系统调用。
- 消息队列、异步消费、外部服务真实链路。
- 浏览器渲染、路由跳转、视觉展示、性能和并发压测。

自动补齐必须生成真实可审查的测试文件；不能只生成测试名称、伪代码或报告文字。

## Mock 规则

使用 Mock 隔离被测单元和外部依赖，例如数据库访问、HTTP client、消息队列、文件系统、时间和随机数、第三方 SDK、浏览器 API 或前端依赖的后端 API。

不要 Mock 正在被测试的业务逻辑。如果一个测试大部分都在断言 Mock 行为，要标记为弱覆盖。

## 命名规则

测试名应描述“场景 -> 预期结果”。

推荐：

- `shouldRejectApprovalWhenStatusIsDraft`
- `shouldReturnErrorWhenRequiredFieldMissing`
- `shouldHideApproveButtonForUnauthorizedUser`
- `shouldCalculateDiscountForBoundaryAmount`

避免：

- `testMethod1`
- `testService`
- `handleClick works`
- `should call mock`
