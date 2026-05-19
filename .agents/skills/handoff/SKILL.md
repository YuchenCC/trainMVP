---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up. Use when user says "handoff", "handover", "transfer to another agent", "summarize for next session", or invokes /handoff.
argument-hint: "What will the next session be used for?"
---

# Handoff Skill

## Quick Start

1. When user requests handoff, run: `handoff_file=$(.agents/skills/handoff/handoff.sh)` to generate a dated versioned file with auto-incrementing version number (e.g., handoff-20260519-v1.md, handoff-20260519-v2.md)
2. Read the file (should be empty initially)
3. Write a comprehensive handoff document summarizing:
   - Current task context
   - What has been completed
   - What remains to be done
   - Key decisions made
   - Relevant artifacts (PRDs, plans, ADRs, issues)
   - Suggested skills for the next session

## Workflow

### Step 1: Create temporary file
```bash
temp_file=$(mktemp -t handoff-XXXXXX.md)
```

### Step 2: Read existing content (if any)
Read the file before writing to avoid overwriting existing content.

### Step 3: Write handoff document
Include these sections:
- **Purpose**: What this handoff covers
- **Completed Work**: Summary of what was accomplished
- **Pending Tasks**: Items remaining to be done
- **Key Decisions**: Important decisions made during the session
- **Relevant Artifacts**: References to PRDs, plans, ADRs, issues, commits
- **Suggested Skills**: Skills the next agent should use
- **Context**: Any other important context

### Step 4: Provide the handoff file path to the user

## Key Guidelines

- **Do not duplicate content** already captured in other artifacts - reference them by path or URL
- **Be concise** but comprehensive - focus on what the next agent needs to know
- **Tailor to the next session** - if user provides arguments, adjust the document accordingly
- **Reference existing documents** by their paths (e.g., `/docs/PRD/RT-xxx.md`)

## Example Output Structure

```markdown
# Handoff Document

## Purpose
[Description of what the next session will focus on]

## Completed Work
- [Item 1]
- [Item 2]

## Pending Tasks
- [Item 1] - Status: [pending/in-progress]
- [Item 2] - Status: [pending/in-progress]

## Key Decisions
- [Decision 1]
- [Decision 2]

## Relevant Artifacts
- PRD: /docs/PRD/RT-xxx.md
- ADR: /docs/adr/xxx.md
- Issue: #123

## Suggested Skills for Next Session
- [Skill 1]
- [Skill 2]

## Context
[Additional context for the next agent]
```

## When to Use

Trigger this skill when:
- User explicitly asks for a handoff
- User wants to transfer work to another agent
- User wants a summary for continuing later
- User invokes `/handoff` command