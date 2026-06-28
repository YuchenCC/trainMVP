# US2.3-班次列表查询与火车切换 API/JMeter 覆盖报告

## 1. 结论摘要
| 项目 | 结论 |
|---|---|
| API 覆盖状态 | 阻塞 |
| 执行结果 | 未执行成功 |
| 失败接口数 | 无法进入具体接口断言，测试套件在环境初始化阶段失败 |
| 阻塞项 | 缺少 `DATABASE_URL` 测试数据库配置；未提供 US2.3 JMeter 脚本/报告 |

## 2. 执行信息
| 项目 | 内容 |
|---|---|
| 环境 | 本地 `release-train/apps/server` |
| 分支/commit | 待确认 |
| JMeter 脚本 | 缺失；未发现 US2.3 对应 `.jmx`，仅发现历史 `requirement-query-test.jmx`，不属于本范围 |
| 执行报告 | Vitest API 测试尝试执行失败；无 JMeter 执行报告 |
| 执行命令 | `vitest run src/__tests__/t2-us2.3-schedule-api.test.ts --coverage` |
| 环境修复尝试 | 已执行 `prisma generate`；第一次缺 `JWT_SECRET`，临时注入测试密钥后继续执行；第二次缺 `DATABASE_URL` |

## 3. 接口覆盖矩阵
| 接口/场景 | 关联需求 | 测试案例 | 当前证据 | 结果 | 缺口 |
|---|---|---|---|---|---|
| `GET /api/schedules` 全局班次列表 | 默认进入 `/schedules` 加载全局班次 | TC2.3-API-01 | 代码路由存在；API 测试文件包含用例 | 未执行成功 | 缺测试数据库配置；缺 JMeter |
| `GET /api/schedules?page=&pageSize=` 分页 | 全局班次分页、每页默认 20 条 | TC2.3-API-02 | route schema 和 service 分页逻辑存在；API 测试文件包含默认/自定义/边界参数用例 | 未执行成功 | 缺测试数据库配置；缺 JMeter |
| `GET /api/schedules` 倒序 | 按创建时间倒序 | TC2.3-API-03 | service 使用 `orderBy: { createdAt: 'desc' }`；API 测试文件包含倒序断言 | 未执行成功 | 缺测试数据库配置；缺 JMeter |
| `GET /api/trains/:trainId/schedules` 指定火车班次 | 火车切换后只展示该火车班次 | TC2.3-API-04 | route/service 存在；API 测试文件包含该用例 | 未执行成功 | 接口当前不分页；缺测试数据库配置；缺 JMeter |
| `GET /api/trains/not-exist/schedules` | 火车不存在错误 | TC2.3-API-05 | service 有火车不存在错误分支；API 测试文件包含该用例 | 未执行成功 | 缺测试数据库配置；缺 JMeter |
| 未登录查询班次列表 | 列表接口需登录 | TC2.3-API-06 | route 使用 `fastify.authenticate`；API 测试文件包含未登录用例 | 未执行成功 | 缺测试数据库配置；缺 JMeter |
| 非管理员创建班次 | 创建班次权限控制 | TC2.3-API-07 | route 使用 `rbacMiddleware(Operation.MANAGE_TRAIN)`；API 测试文件包含非管理员用例 | 未执行成功 | 缺测试数据库配置；缺 JMeter |
| 非管理员变更班次状态 | 状态变更权限控制 | TC2.3-API-08 | route 使用 RBAC；API 测试文件包含非管理员和管理员成功用例 | 未执行成功 | 缺测试数据库配置；缺 JMeter |

## 4. 失败与阻塞
| 类型 | 接口/场景 | 现象 | 影响 | 责任人 |
|---|---|---|---|---|
| 阻塞 | API 自动化执行环境 | 首次执行失败：`JWT_SECRET 环境变量未配置` | 无法创建 Fastify app | 后端开发 / CI 维护人 |
| 阻塞 | API 自动化执行环境 | 注入 `JWT_SECRET` 后失败：`Environment variable not found: DATABASE_URL` | 测试无法创建用户、火车和班次数据，14 个测试未进入断言 | 后端开发 / 测试环境维护人 |
| 缺失 | JMeter 脚本/报告 | 未提供 US2.3 `.jmx` 或执行结果 | 不能输出 JMeter 覆盖结论 | API 自动化测试人员 |

## 5. 补测 TODO
| 优先级 | TODO | 建议脚本 | 说明 |
|---|---|---|---|
| P0 | 提供测试数据库 `DATABASE_URL`，并在 CI/本地测试 profile 中注入 | `src/__tests__/t2-us2.3-schedule-api.test.ts` | 当前 API 测试已存在，但无法因环境缺失执行成功 |
| P0 | 固化 `JWT_SECRET` 测试环境变量 | 同上 | 避免 API 自动化在 app 初始化阶段失败 |
| P1 | 如团队要求 JMeter，补 US2.3 JMeter 脚本和报告 | `jmeter/task2/us2.3-schedules.jmx` | 覆盖 TC2.3-API-01~08，尤其认证、分页、权限和状态变更 |
| P1 | 指定火车班次分页如纳入需求，补接口实现和 API/JMeter 用例 | `GET /api/trains/:trainId/schedules?page=&pageSize=` | 当前代码无 query schema 和 pagination 返回 |

## 6. 给最终报告的摘要
- L2 API 覆盖：阻塞。
- 已有 API 自动化测试文件：`release-train/apps/server/src/__tests__/t2-us2.3-schedule-api.test.ts`，覆盖 TC2.3-API-01~08 的用例结构。
- 实际执行结果：未执行成功，原因是测试环境缺少 `DATABASE_URL`；此前已通过 `prisma generate` 并临时注入 `JWT_SECRET`。
- JMeter：缺失，不能写已覆盖。
- 主要风险：接口自动化证据不可用；后续需要补测试数据库配置或 JMeter 报告。