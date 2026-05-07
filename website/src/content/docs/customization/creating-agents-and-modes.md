---
title: Creating Agents & Output Styles
description: How to create custom agents and output styles for Claude Kit.
---

# Creating Agents & Output Styles

Beyond skills, you can create specialized agents for focused tasks and output styles for different work contexts.

---

## Creating Agents

Agents are specialized subagents that Claude dispatches for independent, focused work. Each agent gets a fresh context and specific tool access.

### Agent Structure

Plugin agents live in the `agents/` directory at the plugin root. For project-specific agents, create them in `.claude/agents/`:

```
.claude/agents/
├── my-custom-agent.md
```

### Agent File Format

```markdown
---
name: my-agent
description: One-line description of what this agent does and when to use it.
tools: [Read, Write, Edit, Bash, Grep, Glob]
model: sonnet
---

# My Agent

## Role
[What this agent specializes in]

## Approach
[How it should work through problems]

## Output Format
[What it should return]

## Examples
[Example inputs and expected outputs]
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Agent identifier |
| `description` | Yes | When to dispatch this agent |
| `tools` | No | Tools the agent can use (defaults to all) |
| `model` | No | Model override (sonnet, opus, haiku) |

### Example: Custom Agent

```markdown
---
name: migration-checker
description: Use when running database migrations to verify safety.
  Check for destructive operations, missing rollbacks, and data loss risks.
tools: [Read, Grep, Glob, Bash]
model: sonnet
---

# Migration Checker

## Role
Review database migration files for safety before execution.

## Checklist
1. Check for destructive operations (DROP TABLE, DROP COLUMN)
2. Verify rollback/down migration exists
3. Check for data loss risks (column type changes, NOT NULL without default)
4. Estimate lock duration on large tables
5. Verify migration is idempotent

## Output Format
Return a safety report:
- SAFE: No issues found
- WARNING: Issues that need review (list them)
- BLOCKED: Destructive changes that need approval
```

### When to Create an Agent vs. a Skill

| Use an Agent when... | Use a Skill when... |
|---------------------|---------------------|
| Task needs isolated context | Knowledge should be in main conversation |
| Work can run independently | Patterns apply inline to current work |
| Multiple tasks can parallelize | Guidance is sequential/conversational |
| Fresh perspective needed | Context from conversation matters |

---

## Creating Output Styles

[Output styles](https://docs.claude.com/en/docs/claude-code/output-styles) are Claude Code's native mechanism for changing communication style, output format, and problem-solving posture for an entire session. Claude Kit ships 5 (see the [Output Styles Reference](/reference/output-styles/)); custom ones live alongside.

### Where to put them

Three locations, in override order (most specific wins):

```
.claude/output-styles/        # Project-specific (checked-in or local)
~/.claude/output-styles/      # Personal (your machine, all projects)
<plugin-root>/output-styles/  # Plugin-shipped (claudekit's 5)
```

### File format

```markdown
---
name: My Style
description: A short description shown in the /config picker.
keep-coding-instructions: true
---

# My Style

[behavioral instructions — written as a system-prompt overlay]
```

### Frontmatter fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No (inherits from filename) | Display name in `/config` |
| `description` | Yes | One-line description shown in the picker |
| `keep-coding-instructions` | No (default `false`) | If `true`, preserves Claude's default coding/testing/verification instructions and adds yours on top. If `false`, your content fully replaces them. |

For engineering workflows, default to `keep-coding-instructions: true`. Use `false` only for non-engineering contexts (writing, analysis).

### Example: pair-programming style

```markdown
---
name: Pair Programming
description: Interactive pair programming — frequent check-ins, small chunks, discuss before deciding.
keep-coding-instructions: true
---

# Pair Programming

You are pair-programming with the user. They want to be involved in decisions, not handed a finished implementation.

## Posture

- Think out loud. Explain reasoning as you code.
- Ask before non-obvious choices. Don't decide the file structure or pattern unilaterally.
- Show code in 10-20 line chunks. Pause for feedback after each chunk.
- Suggest 1-2 alternatives when multiple approaches exist.

## Output format

For each chunk:
1. Brief explanation of what you're about to add (1 sentence).
2. The chunk (10-20 lines).
3. "Continue?" or a clarifying question.

## What you DON'T do

- Don't ship 200 lines without checking in.
- Don't refactor adjacent code "while you're there."
- Don't pick a library or pattern the user hasn't seen before without discussing it first.
```

### Example: compliance style

```markdown
---
name: Compliance
description: Strict compliance posture — formal language, audit trails, security-first.
keep-coding-instructions: true
---

# Compliance

You are working in a regulated environment. Every decision is documented; every shortcut is flagged.

## Posture

- Formal, precise language. No idioms.
- Reference specific regulations or controls when relevant (HIPAA, PCI-DSS, SOC 2, etc.).
- Flag compliance risks proactively, even if not asked.
- Require explicit approval for any change that touches PII, audit logs, or access controls.

## Output format

- Include audit trail comments in code (`// COMPLIANCE: <reason>`).
- Document security decisions inline.
- For changes touching regulated data paths, generate a one-line compliance note in the PR description.
```

## Activating custom output styles

Switch via `/config` (the style appears in the picker once the file exists in any of the three locations) or by setting `outputStyle` directly in `.claude/settings.local.json`:

```json
{
  "outputStyle": "Pair Programming"
}
```

The choice persists across sessions until changed.

## Related Pages

- [Agents Reference](/reference/agents/) — The 8 built-in agents
- [Output Styles Reference](/reference/output-styles/) — The 5 built-in output styles
- [Creating Skills](/customization/creating-skills/) — Custom skill creation
