---
title: MCP Servers
description: Optional MCP server integrations for enhanced capabilities.
---

# MCP Servers

Claude Kit includes optional [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server configurations that extend Claude's capabilities with external tools.

## How MCP Works

MCP servers give Claude access to tools it doesn't have natively — browser automation, persistent memory, real-time documentation, and structured reasoning. They run as local processes that Claude communicates with during your session.

MCP servers are configured via `/claudekit:init`, which adds them to your project's `.mcp.json` with automatic platform detection (Windows vs macOS/Linux).

---

## Available Servers

### Context7

**Purpose**: Real-time library documentation lookup.

Fetches current documentation for any library, framework, or API. Use instead of relying on Claude's training data, which may be outdated.

```
You: "How do I set up middleware in Next.js 15?"

Claude fetches current Next.js 15 docs via Context7
→ Answers with up-to-date API syntax
```

**Best for**: API syntax, configuration, version migration, library-specific debugging.

**Setup**: Run `/claudekit:init` and select Context7.

---

### Sequential Thinking

**Purpose**: Structured step-by-step reasoning with explicit thought chains.

Provides a tool for multi-step analysis where each step has a confidence score and the chain can revise earlier steps as new evidence comes in.

```
Investigation:
  Step 1: Capture the error → confidence: 0.9
  Step 2: Form hypothesis (X causes Y when Z) → confidence: 0.7
  Step 3: Test hypothesis with instrumentation → confidence: 0.85
  Step 4: Verify the fix doesn't regress → confidence: 0.95
```

**Best for**: Complex debugging, architectural trade-off analysis, security review where multiple hypotheses need to be tracked simultaneously.

**Setup**: Run `/claudekit:init` and select Sequential Thinking.

---

### Memory

**Purpose**: Persistent knowledge graph across sessions.

Stores entities, relationships, and observations that persist across conversations. Claude can recall project decisions, user preferences, and architectural context the next time you sit down.

```
Session 1: "We decided to use PostgreSQL RLS for multi-tenancy"
  → Stored as entity + decision observation

Session 2 (a week later): "What did we decide about multi-tenancy?"
  → Retrieved from memory graph
```

**Best for**: Long-running projects, decision tracking, building up codebase knowledge over time.

**Setup**: Run `/claudekit:init` and select Memory.

---

### Filesystem

**Purpose**: Sandboxed file operations with configurable allowed directories.

Useful for projects with strict file access requirements (e.g., when you want Claude restricted to a specific subtree of a monorepo, or when you're operating in a regulated environment with audit-trail requirements).

**Best for**: Projects with strict file access requirements; regulated codebases.

**Setup**: Run `/claudekit:init` and select Filesystem.

---

### Playwright

**Purpose**: Browser automation for testing and verification.

Enables Claude to control a real browser for E2E testing, visual verification, and runtime UI checks.

```
You: "Verify the login flow works in production"

Claude launches a browser via Playwright MCP:
  → Navigate to /login
  → Fill email and password
  → Click submit
  → Verify redirect to /dashboard
  → Take screenshot for evidence
```

**Best for**: E2E testing, visual regression checks, the non-IDE verification step in `verification-gate`.

**Setup**: Run `/claudekit:init` and select Playwright.

---

## Setup

### Prerequisites

MCP servers require Node.js installed on your system.

### Enabling Servers

Run the setup wizard and select which servers to configure:

```
/claudekit:init
```

Or install all servers at once:

```
/claudekit:init --all
```

The wizard automatically detects your platform and configures the correct command format in `.mcp.json`. Restart Claude Code after configuration.

---

## Which skills benefit from each server

| MCP Server | Skills that get the most lift |
|------------|------------------------------|
| Context7 | `audit-dependencies` (verify advisories against current docs), `investigate-root-cause` (confirm framework behavior matches docs), `shape-spec` (research library options before committing), `incremental-shipping` (read changelog before bumping a dep) |
| Sequential Thinking | `investigate-root-cause` (the 4-phase loop benefits from explicit confidence tracking), `plan-review-architecture` (multi-dimensional scoring), `shape-spec` (working through alternatives systematically) |
| Memory | `shape-spec` (recall design decisions across sessions), `map-codebase` (build up codebase knowledge over time), `release-and-changelog` (recall release history) |
| Playwright | `test-first` (E2E test cases for UI flows), `verification-gate` (the non-IDE verification step — exercising the change in a real browser) |
| Filesystem | Project-wide; no specific skill mapping. Use when you need scoped file access. |

MCP servers are optional — claudekit's spine works without them. They add capability where they fit; the skills enforce discipline regardless.
