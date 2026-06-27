# Risk Classification

Use this reference when documenting uncovered changed logic.

## High Risk

Classify as high risk when uncovered logic affects:

- Money, quota, billing, settlement, or critical calculation.
- Authentication or authorization.
- State transitions for important business workflows.
- Data deletion, cancellation, approval, or release actions.
- External side effects such as messages, payments, notifications, or file writes.
- Error handling that can cause data corruption or blocked workflow.

Required action: add unit tests or explicitly cover with API/integration/E2E tests before passing.

## Medium Risk

Classify as medium risk when uncovered logic affects:

- Validation rules.
- Sorting, filtering, pagination, or search behavior.
- Data transformation with conditions.
- UI interaction or conditional rendering.
- Non-critical fallback or retry behavior.

Required action: prefer adding tests; if excluded, document why another test layer is more appropriate.

## Low Risk

Classify as low risk when uncovered changes are:

- Static display text.
- Styling-only changes.
- Simple type or DTO changes.
- Constants with no behavior.
- Framework wiring with no branch.

Required action: exclusion reason is enough if there is no hidden behavior.
