# Coverage Rules

Use these rules when evaluating the unit-test coverage gate.

## Required Gates

- Incremental coverage must be at least 80%.
- Unit-test pass rate must be 100%.

## Preferred Coverage Scope

Prefer this order:

1. Changed executable lines in the current requirement or diff.
2. Changed executable functions or methods.
3. Changed files touched by the requirement.
4. Full module coverage only when incremental coverage is unavailable.
5. Full-project coverage only when explicitly requested.

## Denominator Rules

Include changed executable logic.

Exclude only with a stated reason:

- Generated code.
- DTO/type/interface-only changes.
- Pure constants.
- Pure styling.
- Framework boilerplate with no branch or business behavior.
- Configuration with no executable branch.

## If Coverage Tooling Differs

Use the project's native tooling:

- Java backend: JaCoCo or the team's configured coverage plugin.
- JavaScript/TypeScript frontend: Jest, Vitest, Istanbul, or the team's configured coverage plugin.
- Other stacks: the configured project coverage tool.

The skill governs the gate, not the specific tool.

## Missing Coverage Data

If coverage data is missing, do not claim the gate passed. Mark the result as blocked or failed and request the missing report.
