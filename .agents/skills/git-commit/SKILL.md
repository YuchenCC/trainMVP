# Git Commit Skill

Generate conventional, informative commit messages for your project.

## When to Use

- After making code changes
- User says "commit this" / "commit changes" / "create commit"
- Before creating PRs

## Format Standard

Use Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat** : New feature
- **fix** : Bug fix
- **refactor** : Code refactoring (no functional change)
- **test** : Add/update tests
- **docs** : Documentation only
- **perf** : Performance improvement
- **build** : Build system changes
- **chore** : Maintenance (dependency updates, etc)
- **ci** : CI configuration changes
- **style** : Formatting changes
- **revert** : Revert previous commit

### Scope Examples

- Module name: `core`, `api`, `web`, `server`
- Component: `auth`, `requirements`, `release-train`
- Area: `ui`, `database`, `config`

### Subject Rules

- Imperative mood: "Add support" not "Added support"
- No period at end
- Max 50 chars
- Lowercase after type

### Body (optional but recommended)

- Explain WHAT and WHY, not HOW
- Wrap at 72 chars
- Reference issues: "Fixes #123" / "Relates to #456"

## Workflow

1. **Analyze changes** using `git status` and `git diff`
2. **Identify scope** from modified files
3. **Determine type** based on change nature
4. **Generate message** following format
5. **Ask user for confirmation** before executing
6. **Execute commit**: `git commit -m "message"`

## Examples

### Simple fix
```
fix(auth): prevent NPE when user is null

Check for null before accessing user object to avoid
NullPointerException during authentication.

Fixes #234
```

### Feature
```
feat(requirements): add batch import capability

Allow users to import multiple requirements at once via CSV file.
Supports validation and duplicate detection.

Closes #567
```

### Documentation
```
docs(readme): add deployment guide

Add step-by-step guide for deploying the system:
- Prerequisites
- Environment setup
- Build and deploy
- Health check
```

## Anti-patterns

Avoid:
- "fix stuff" / "update code" / "changes"
- "WIP" commits (unless explicitly requested)
- Mixing unrelated changes
- Over-detailed technical implementation in message

Good commits:
- Single logical change
- Clear, searchable subject
- References issues when applicable
- Explains business value
