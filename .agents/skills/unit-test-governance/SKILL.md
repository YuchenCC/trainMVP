---
name: unit-test-governance
description: Enforce unit-test governance for frontend or backend changed code. Use when a developer needs to decide what changed logic requires unit tests, what can be excluded, whether incremental coverage is at least 80%, whether unit-test pass rate is 100%, or how to document uncovered unit-test risk before code review, merge, test handoff, or release.
---

# Unit Test Governance

## Purpose

Use this skill as a technology-neutral unit-test quality gate for changed code. It applies to frontend and backend projects, including Java, JavaScript, TypeScript, React, Vue3, and other stacks.

This skill does not teach a specific framework such as JUnit5, Vitest, Jest, or Vue Test Utils. Use framework-specific skills or project conventions for implementation details.

## Hard Gates

Unit-test work passes only when both gates are satisfied:

1. Incremental unit-test coverage is greater than 80% for the changed executable code in scope.
2. Unit-test pass rate is 100%.

These hard gates apply only to unit tests. Do not use API, integration, E2E, JMeter, Postman, Playwright, Cypress, or other non-unit tests to satisfy the incremental coverage or pass-rate gates.

If either gate fails, mark the unit-test governance result as failed and list the required remediation.

Do not use full-project coverage as the primary quality gate unless the user explicitly asks for it. Prefer changed-code or requirement-scope coverage.

## Scope

Evaluate only the current change scope unless the user specifies otherwise. The scope can be:

- A requirement or task.
- A branch.
- A commit range.
- A pull request diff.
- A user-provided file list.
- A module or package touched by the change.

When scope is unclear, infer it from local Git changes or recent commits and state the assumption.

## Required Workflow

1. Identify changed executable code.
2. Discover existing unit-test files in the project before deciding coverage is missing.
3. Map changed code to related tests by file path, module name, function/class name, API route, feature name, and test titles.
4. If related tests exist and the local environment can run them, run the smallest relevant test command first.
5. If a coverage command is available, run or request the smallest relevant incremental coverage command.
6. Classify changed code as must-cover, may-exclude, covered by existing tests, or needs non-unit-test coverage.
7. Check unit-test execution result and pass rate.
8. Check incremental coverage result when coverage data is available.
9. Produce a governance summary, existing-test evidence, TODO list, and uncovered-risk table.
10. Conclude with pass, fail, or blocked against the two hard gates.


## Existing Test Discovery

Before producing TODOs, inspect the repository for existing tests that may already cover the changed code.

Search in common unit-test locations and patterns, including but not limited to:

- Java unit tests: `src/test/java/**/*Test.java`, `src/test/kotlin/**/*Test.kt`
- Frontend unit/component tests: `src/**/*.test.*`, `src/**/*.spec.*`
- Unit-test folders: `**/__tests__/**/*`, `test/**/*`, `tests/**/*`

Exclude test files that are clearly API, integration, E2E, load, or contract tests unless the user explicitly asks to inspect them. Examples to exclude for this skill:

- API route tests that exercise HTTP endpoints end-to-end.
- JMeter, Postman, Newman, REST-assured API suites.
- Playwright, Cypress, Selenium, or other browser E2E suites.
- Files named or located under `e2e`, `api`, `integration`, `contract`, `jmeter`, or `load` test folders.

Use these matching signals:

| Signal | Example |
|---|---|
| Same module path | `requirements/service.ts` -> `requirements*.test.ts` |
| Same feature name | `requirement`, `reqCode`, `需求编号` |
| Same function/class name | `generateReqCode`, `RequirementService` |
| Same API route or user story | `POST /api/requirements`, `US1.1` |
| Same unit-level bug symptom | numeric sort, retry branch, conflict handling inside the unit |
| Same changed behavior | format, validation, permission, state transition |

If related unit tests exist, report them as evidence before listing missing TODOs. Do not count API or E2E tests as unit-test evidence for the two hard gates.

Required existing-test evidence table:

| Test file | Matching signal | What it appears to cover | Coverage confidence |
|---|---|---|---|

Coverage confidence values:

- `High`: directly asserts the changed behavior or branch.
- `Medium`: exercises the changed path but does not assert the specific behavior.
- `Low`: only covers broad flow or output format.
- `None`: related file exists but does not cover this changed behavior.

Do not say there are no tests until the repository test files have been searched.

## Test Execution Rule

If related test files exist, run the smallest safe relevant test command whenever feasible.

Prefer this order:

1. A single test file.
2. A filtered test name or test pattern.
3. The package/module test command.
4. The full test command only if targeted commands are unavailable or the user asks for it.

Examples:

```text
Java/Maven: mvn -Dtest=RequirementServiceTest test
Java/Gradle: ./gradlew test --tests '*RequirementServiceTest'
Node/Vitest: pnpm vitest run src/__tests__/requirements.test.ts
Node/Jest: npm test -- requirements.test.ts
```

If test execution is not possible, explain why and still produce the code-scan TODO list.

Never treat the existence of a test file as sufficient. Prefer actual execution results. If tests are not run, classify evidence as static inspection only.

## Must-Cover Changed Logic

Require unit tests for changed code that affects behavior, decisions, or results.

Must cover these categories:

| Category | Examples |
|---|---|
| Business rules | Submit, approve, reject, cancel, allocate, calculate eligibility |
| Conditional branches | `if/else`, `switch`, ternary decisions, strategy selection |
| Validation logic | Required fields, length, format, enum, range, null handling |
| State transitions | Draft to pending, pending to approved, enabled to disabled |
| Permission checks | Role checks, ownership checks, feature visibility decisions |
| Calculations | Amount, discount, quantity, score, percentage, priority weight |
| Date/time logic | Expiry, deadline, duration, cross-day, timeout, effective date |
| Data transformation | DTO to entity, API response assembly, enum mapping, field derivation |
| Error handling | Not found, invalid status, permission denied, external failure |
| Boundary values | Zero, one, min, max, empty list, single item, many items |
| Dedup/sort/page | Duplicate handling, sort order, page boundary, total count |
| Idempotency | Repeat submit, repeat cancel, repeat approve, duplicate request |
| Retry/fallback | Retry success, retry exhausted, fallback path, timeout path |
| Cache behavior | Hit, miss, refresh, expiry, invalidation |
| Frontend form logic | Required fields, error messages, disabled submit |
| Frontend permissions | Button/menu/entry visible or hidden by role/state |
| Frontend request states | Loading, empty, error, success |
| Frontend interactions | Search, filter, paginate, sort, modal confirm, submit |

Use this rule of thumb:

> If changed code can change business output, page behavior, data state, permissions, validation, or error handling, it needs unit-test coverage.

## May-Exclude Changed Code

Changed code may be excluded from unit-test coverage when it contains no meaningful executable logic.

Allowed exclusions:

| Category | Reason |
|---|---|
| Simple DTO/VO/type/interface definitions | Structure only, no behavior |
| Simple getters/setters | No business logic |
| Constants | No calculation or branch |
| Pure styling | CSS, static class names, visual-only changes |
| Framework boilerplate | Startup wiring, generated shell code, registration with no branch |
| Configuration | No executable branch or behavior worth unit testing |
| Pure static display component | No condition, state, event, permission, or request behavior |
| Generated code | Generated by OpenAPI, ORM, protobuf, or similar tooling |
| Third-party library internals | Test project usage, not the library itself |

Every exclusion must include a short reason. If the exclusion creates business or release risk, record it in the uncovered-risk table.

## Needs Non-Unit-Test Coverage

Some changed behavior may be better covered by API, integration, or E2E tests instead of unit tests.

Classify as non-unit-test coverage when the main risk is:

- Cross-service or cross-system integration.
- Database transaction behavior that cannot be isolated meaningfully.
- HTTP contract compatibility.
- Browser rendering and route navigation.
- Full user journey across frontend and backend.
- Performance, concurrency, or load behavior.

Do not silently ignore these. Mark the unit-test result as excluded for unit-test purposes, then record the required API, integration, or E2E coverage.

## Mocking Rules

Use mocks to isolate the unit under test from external dependencies.

Mock these dependencies when needed:

- Database access.
- HTTP clients.
- Message queues.
- File system.
- Time and randomness.
- Third-party SDKs.
- Browser APIs or backend APIs in frontend unit tests.

Do not mock the logic being tested. If most of a test is mocked behavior, flag it as weak coverage.

## Naming Rules

Prefer names that state behavior and expected result.

Good patterns:

- `shouldRejectApprovalWhenStatusIsDraft`
- `shouldReturnErrorWhenRequiredFieldMissing`
- `shouldHideApproveButtonForUnauthorizedUser`
- `shouldCalculateDiscountForBoundaryAmount`

Avoid names that only describe implementation details:

- `testMethod1`
- `testService`
- `handleClick works`
- `should call mock`

## Coverage Measurement Rules

Use the project’s native coverage tool, but interpret results consistently.

Read `references/coverage-rules.md` when coverage source or formula is unclear.

Minimum acceptable result:

```text
incremental unit-test coverage > 80%
unit-test pass rate = 100%
```

For incremental coverage, prefer executable changed lines or changed functions. Exclude generated files and approved no-logic files when calculating the denominator.

If coverage data cannot be produced, mark the gate as failed unless the user explicitly accepts manual risk documentation.


## Code-Scan-Only Mode

When test results or coverage reports are unavailable, do not stop after marking the gate as blocked.

Still analyze the changed code and produce a unit-test TODO list. This mode is useful during code review, early development, or before tests have been written.

In code-scan-only mode:

1. Search the repository for related test files before declaring missing coverage.
2. If related tests exist and can be run, run the smallest relevant test command and include the result.
3. Mark the final decision as `Blocked` only when pass rate or incremental coverage remains unavailable.
4. Identify changed executable logic that requires unit-test coverage.
5. Distinguish existing coverage from missing or weak coverage.
6. Produce a prioritized TODO list for missing or recommended unit tests.
7. Separate unit-test TODOs from API, integration, or E2E TODOs.
8. State which evidence is missing to make a final pass/fail decision.

Required TODO table:

| Priority | File | Changed logic | Why it needs unit test | Suggested test case | Preferred layer |
|---|---|---|---|---|---|

Priority rules:

- `P0`: high-risk business logic, state transition, permission, data corruption, uniqueness, conflict, retry, idempotency, or transaction behavior.
- `P1`: validation, transformation, boundary value, sorting, pagination, formatting, or user-visible branch behavior.
- `P2`: low-risk branch hardening, defensive checks, or optional clarity tests.

If a changed behavior is not appropriate for unit tests, still include it in the TODO list with `Preferred layer` set to `API`, `Integration`, or `E2E`.

## Required Output

Always output the following sections in this order. Use Chinese section names and Chinese table headers in the Markdown report file. Do not collapse them into prose, even when the result passes.

### 1. Unit Test Governance Summary

| Item | Result |
|---|---|
| Change scope | Branch, commit range, files, or requirement |
| Changed files checked | N |
| Must-cover items | N |
| Excluded items | N |
| Unit tests executed | N |
| Passed | N |
| Failed | N |
| Pass rate | 100% / not 100% |
| Incremental coverage | xx% |
| Coverage gate | Pass / Fail |
| Final conclusion | Pass / Fail / Blocked |

### 2. Existing Test Evidence

List related unit tests first. List API, integration, E2E, JMeter, Playwright, Cypress, or other non-unit tests only as non-gate evidence.

| Test file | Test layer | Matching signal | What it covers | Gate evidence |
|---|---|---|---|---|

Use `Gate evidence` values:

- `Yes`: unit test evidence that can count toward unit-test pass rate and incremental coverage.
- `No`: API, integration, E2E, JMeter, Playwright, Cypress, manual, or other non-unit evidence.

### 3. Coverage Classification

Classify every must-cover changed logic item. This table is required for pass, fail, and blocked results.

| File | Changed logic | Classification | Evidence | Preferred layer |
|---|---|---|---|---|

Use these classifications exactly:

- `Covered by unit test`
- `Excluded: no logic`
- `Needs API/integration/E2E coverage`
- `Missing unit test`
- `Weak assertion`

### 4. Uncovered Or Excluded Risk

Always include this section. If there is no risk, write one row with `None`.

| File | Changed logic | Classification | Reason | Risk | Required action |
|---|---|---|---|---|---|

### 5. Unit Test Execution Evidence

Include the exact smallest relevant command that was run, the test count, pass/fail count, and the coverage source. When coverage is computed from changed lines rather than the tool's full-file summary, state that explicitly.

### 6. Final Decision

Use exactly one decision: `Pass`, `Fail`, or `Blocked`.

Also provide the downstream report hint for `test-coverage-report`:

| Report field | Value |
|---|---|
| Unit-test gate | Pass / Fail / Blocked |
| Can count toward PM/test-manager final report | Yes |
| API/integration/E2E evidence included | Yes / No |
| Recommended delivery conclusion | 可提测 / 有条件提测 / 不建议提测 |

Do not produce the full requirement coverage matrix here unless the user explicitly asks for a final test coverage report. That belongs to `test-coverage-report`.
### Markdown Report File

Always write the unit-test governance result to a Markdown file when filesystem access is available.

Recommended path:

```text
reports/unit-test-governance/commit-{short-sha}-unit-test-governance.md
```

If the scope is a commit hash, name the file `commit-{short-sha}-unit-test-governance.md`, where `{short-sha}` is the first 7 characters of the commit. If the scope is a branch, name the file `branch-{branch-name}-unit-test-governance.md` after replacing `/` and spaces with `-`. If the scope is a requirement or task, name the file `requirement-{requirement-id-or-name}-unit-test-governance.md` after replacing `/` and spaces with `-`. If the repository does not have a `reports/unit-test-governance/` directory, create it. The Markdown file must be written in Chinese and contain the same six required output sections, including the downstream report hint. In the final chat response, link to the generated report file and summarize only the decision, pass rate, and incremental coverage.

If writing the file is not possible, say so explicitly and still provide the full Chinese Markdown content in the chat.
## Final Decision

Use exactly one final decision:

| Decision | Meaning |
|---|---|
| Pass | Incremental coverage is at least 80%, unit-test pass rate is 100%, and uncovered risks are acceptable or out of unit-test scope |
| Fail | Coverage is below 80%, pass rate is below 100%, required tests are missing, or uncovered high-risk logic exists |
| Blocked | Required coverage or test-result data is unavailable and cannot be inferred |

When failed, list the smallest concrete actions needed to pass the gates.

## References

Load these only when needed:

- `references/coverage-rules.md` for incremental coverage interpretation.
- `references/risk-classification.md` for uncovered-risk severity.
- `references/output-template.md` for a reusable report template.
