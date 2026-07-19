# automating-api-testing 使用说明

本 skill 自动化测试 REST 和 GraphQL API，包括请求生成、响应验证、schema 合规性检查、认证流程和错误处理。

## 用途与边界

| 负责 | 不负责 |
|---|---|
| 解析 API 规范并生成测试用例 | 运行单测或判定单测门禁 |
| 验证 API 响应结构和数据完整性 | 替代 `unit-test-governance` |
| 测试 CRUD 生命周期和边界情况 | 执行 UI 自动化测试 |
| 生成 API 测试覆盖报告 | 替代 `test-report-generator` |

## 支持的测试框架

- **Node.js**: Supertest
- **Java**: REST-assured
- **Python**: httpx + pytest
- **Postman/Newman**: 集合测试
- **Pact**: 消费者驱动契约测试

## 执行流程

```
解析API规范 → 生成测试用例 → 验证响应结构 → 测试CRUD生命周期 → 测试错误处理 → 生成覆盖报告
```

## 使用方式

### 触发命令

```
Use Skill: automating-api-testing
```

或：

```
"test the API", "generate API tests", "validate API contracts"
```

### 前置条件

- API 测试库已安装（Supertest、REST-assured、httpx 或 Postman/Newman）
- API 规范文件（OpenAPI/Swagger YAML/JSON 或 GraphQL SDL）
- 测试环境中运行的目标 API
- 认证凭据或 API Key

## 测试用例生成

每个端点生成以下测试：

| 测试类型 | 说明 |
|---|---|
| 成功案例 | 发送符合 schema 的有效请求，断言 200/201 响应 |
| 验证错误 | 发送缺少必填字段、错误类型、超出范围的值，断言 400 响应 |
| 认证测试 | 测试有效、过期、缺失凭据，断言 200、401、403 |
| 资源不存在 | 请求不存在的资源，断言 404 响应 |
| 幂等性 | 重复发送 PUT/DELETE 请求，验证行为一致 |

## 响应验证

- Content-Type 匹配预期
- 响应体符合 OpenAPI schema
- 响应头检查（Cache-Control、Rate-Limit、CORS）
- 分页元数据验证

## 输出产物

| 产物 | 路径 |
|---|---|
| API 测试文件 | `tests/api/` 目录下按资源组织 |
| Postman 集合 | `.trae/skills/automating-api-testing/output/*.postman_collection.json` |
| JMeter 脚本 | `.trae/skills/automating-api-testing/output/*.jmx` |
| 测试覆盖报告 | `.trae/skills/automating-api-testing/output/test-coverage-report.md` |

## 示例代码

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('GET /api/schedules', () => {
  it('returns a paginated schedule list', async () => {
    const res = await request(app)
      .get('/api/schedules?page=1&pageSize=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body.list).toBeInstanceOf(Array);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('returns 401 without authentication', async () => {
    await request(app).get('/api/schedules').expect(401);
  });
});
```

## 常见问题

| 问题 | 原因 | 解决方法 |
|---|---|---|
| Connection refused | API 服务器未启动或 URL 错误 | 检查服务器状态和 `BASE_URL` 配置 |
| 401 on all requests | 认证 token 过期或配置错误 | 刷新 token，检查 `Authorization` 头格式 |
| Schema validation fails | API 响应包含 spec 中未定义的字段 | 更新 OpenAPI spec 或设置 `additionalProperties: true` |
| Test data conflicts | 其他测试修改或删除了资源 | 使用唯一测试数据，在 `beforeEach` 中创建资源 |

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
| `assets/example_openapi.yaml` | OpenAPI 规范示例 |
| `assets/example_graphql_schema.graphql` | GraphQL schema 示例 |
| `assets/test_suite_template.js` | 测试套件模板 |