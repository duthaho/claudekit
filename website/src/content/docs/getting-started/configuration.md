---
title: Configuration
description: How to configure Claude Kit for your project using the init wizard.
---

# Configuration

Claude Kit works out of the box after installing the plugin. Run `/claudekit:init` to scaffold project-level configuration for rules, modes, hooks, and MCP servers.

## The Init Wizard

```
/claudekit:init
```

The wizard walks you through four steps, asking one question at a time:

### Step 1: Rules

Rules enforce standards when Claude works on specific file types:

| Rule | Applies To | What It Enforces |
|------|-----------|------------------|
| `api.md` | API routes, controllers | Input validation, error responses, rate limiting |
| `frontend.md` | `.tsx`, `.jsx`, components | PascalCase, Server Components, accessibility |
| `migrations.md` | Migration files | Reversible migrations, indexes, transactions |
| `security.md` | All files | No hardcoded secrets, parameterized queries, no `eval()` |
| `testing.md` | Test files | Naming conventions, coverage thresholds, no `.only()` |

Rules are installed to `.claude/rules/`.

### Step 2: Modes

Modes change how Claude communicates and solves problems:

| Mode | Best For |
|------|----------|
| `default` | General tasks |
| `brainstorm` | Design, ideation |
| `implementation` | Code-focused, minimal prose |
| `review` | Critical analysis |
| `token-efficient` | High-volume work, cost savings |
| `deep-research` | Investigation, audits |
| `orchestration` | Multi-agent coordination |

Modes are installed to `.claude/modes/`. Switch with natural language: "switch to brainstorm mode".

### Step 3: Hooks

Hooks run automatically in response to Claude Code events:

| Hook | Event | What It Does |
|------|-------|-------------|
| `auto-format` | After Write/Edit | Runs ruff (Python) or eslint (JS/TS) on changed files |
| `block-dangerous-commands` | Before Bash | Blocks `rm -rf /`, force push to main, `DROP TABLE`, etc. |
| `notify` | Notification | Cross-platform desktop notifications |

Hooks are installed to `.claude/hooks/` with config in `settings.local.json` (gitignored).

### Step 4: MCP Servers

MCP servers extend Claude with external tools:

| Server | Purpose |
|--------|---------|
| Context7 | Real-time library documentation |
| Sequential Thinking | Structured step-by-step reasoning |
| Playwright | Browser automation for E2E testing |
| Memory | Persistent knowledge graph |
| Filesystem | Secure file operations |

MCP servers are configured in `.mcp.json` with automatic platform detection (Windows vs macOS/Linux).

### Install Everything

Skip all prompts and install everything:

```
/claudekit:init --all
```

## Project-Level CLAUDE.md

After running init, you may want to create your own `.claude/CLAUDE.md` for project-specific instructions. This is independent of Claude Kit — it's a standard Claude Code feature:

```markdown
# My SaaS Project

## Tech Stack
- **Backend**: FastAPI + PostgreSQL
- **Frontend**: Next.js 14 + Tailwind
- **Auth**: Clerk
- **Payments**: Stripe

## Code Conventions
- Python: PEP 8, type hints required
- TypeScript: Strict mode, Zod for validation

## Testing
- Python: pytest with 80% coverage minimum
- Frontend: vitest + Playwright
```

## Agent Behavior Overrides

You can customize agent behavior in your CLAUDE.md:

```markdown
## Agent Behavior Overrides

### claudekit:planner
- Break tasks into 15-60 minute chunks
- Always identify testing requirements

### claudekit:code-reviewer
- Enforce strict typing
- Security-first reviews
- Check for test coverage

### claudekit:tester
- Use pytest for Python, vitest for TypeScript
- Generate edge case tests
```

## Next Steps

- [Workflows](/workflows/planning-and-building/) — See how skills work together
- [Skills Reference](/reference/skills/) — Browse all 15 skills
- [Creating Skills](/customization/creating-skills/) — Build your own
