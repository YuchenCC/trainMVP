# 单测执行规则

仅在用户确认“仅执行验证”或确认自动补齐后的验证时使用。执行范围仍限于用户指定的单测文件，以及自动补齐后新增或追加的相关单测。

## 最小执行优先级

1. 单个测试文件。
2. 过滤后的测试名或测试 pattern。
3. 包或模块测试命令。
4. 全量测试命令，仅在无法定位更小命令或用户明确要求时使用。

命令优先从配置 `commands.backend_unit_test` 读取；配置不存在时可参考：

```text
Java/Maven: mvn -Dtest=RequirementServiceTest test
Java/Gradle: ./gradlew test --tests '*RequirementServiceTest'
Node/Vitest: pnpm vitest run src/modules/requirements/service.test.ts
Node/Jest: npm test -- requirements.test.ts
```

## 结果处理

- 不要把“存在测试文件”当成通过证据；优先记录实际执行结果。
- 无法执行时，记录原因；第 7 节填“未执行”，第 8 节保持“本地阻塞”，并说明复核条件。
- 覆盖率命令、增量口径和缺失数据处理按 `coverage-rules.md` 执行。
