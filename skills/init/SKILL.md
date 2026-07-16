---
name: init
description: >
  Interactive setup wizard for claudekit. Scaffolds rules, hooks, and MCP server
  configs into the user's project. Run /claudekit:init to configure. Use when
  setting up a new project with claudekit or reconfiguring an existing one.
user-invocable: true
argument-hint: "[--all] to skip prompts and install everything"
---

# Claudekit Init

Interactive setup wizard that scaffolds project-level configuration files into the user's `.claude/` directory.

Output styles ship with the plugin and are auto-discovered by Claude Code (no init step needed for them — see `output-styles/` at the plugin root).

## What It Generates

| Category | Files | Location |
|----------|-------|----------|
| Rules | api.md, frontend.md, migrations.md, security.md, testing.md | `.claude/rules/` |
| Hooks | auto-format, block-dangerous-commands, detect-secrets, guard-sensitive-files, notify | `.claude/hooks/` + `settings.local.json` |
| MCP Servers | context7, sequential, playwright, memory, filesystem | `.mcp.json` |

---

## Wizard Flow

When invoked, ask the user **ONE question at a time**:

### Step 1: Rules

"Which rules do you want to install?"
- a) All rules (api, frontend, migrations, security, testing)
- b) Let me pick individually
- c) Skip rules

If (b), list each rule with a one-line description and let user select:
- **api.md** — REST API design conventions (naming, versioning, error responses)
- **frontend.md** — React/Next.js component patterns and file organization
- **migrations.md** — Database migration safety rules (backward compatibility, rollback)
- **security.md** — OWASP-aligned security rules (no hardcoded secrets, parameterized queries)
- **testing.md** — Test naming, coverage thresholds, mocking conventions

For each selected rule, read the template from `${CLAUDE_PLUGIN_ROOT}/skills/init/templates/rules/<name>.md` and write it to `.claude/rules/<name>.md`.

### Step 2: Hooks

"Which hooks do you want to install?"
- a) Auto-format (runs linter after Write/Edit)
- b) Block dangerous commands (prevents rm -rf /, force push main, etc.)
- c) Detect secrets (blocks writes containing API keys, tokens, private key blocks)
- d) Guard sensitive files (blocks edits to .env files, key material, credential dotfiles)
- e) Notifications (desktop notifications on completion)
- f) All of the above
- g) Skip hooks

For each selected hook:

1. Read the hook metadata from `${CLAUDE_PLUGIN_ROOT}/skills/init/templates/hooks.json`
2. Copy the hook script from `${CLAUDE_PLUGIN_ROOT}/scripts/<script>.cjs` to `.claude/hooks/<script>.cjs`
3. Merge the hook entry into `.claude/settings.local.json` (create if it doesn't exist)

Hook entry format for `settings.local.json`:
```json
{
  "hooks": {
    "<event>": [
      {
        "matcher": "<matcher>",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/<script>.cjs"
          }
        ]
      }
    ]
  }
}
```

If `settings.local.json` already has a `hooks` key, merge new entries into the existing structure — do not overwrite.

### Step 3: MCP Servers

"Which MCP servers do you want to configure?"
- a) Context7 (library documentation lookup)
- b) Sequential Thinking (multi-step reasoning)
- c) Playwright (browser automation)
- d) Memory (persistent knowledge graph)
- e) Filesystem (secure file operations)
- f) All of the above
- g) Skip MCP setup

For each selected server:

1. Read the server config from `${CLAUDE_PLUGIN_ROOT}/skills/init/templates/mcp-servers.json`
2. Detect platform: check if `process.platform === "win32"` or use Bash `uname` to determine OS
3. Select the correct config (`win32` or `posix` key)
4. Merge into the project's `.mcp.json` (create with `{"mcpServers": {}}` if it doesn't exist)

### Step 4: Summary

Print a summary table of everything installed:

```
Claudekit setup complete!

  Rules:   5 installed → .claude/rules/
  Hooks:   5 installed → .claude/hooks/ + settings.local.json
  MCP:     5 configured → .mcp.json

Next steps:
  - Skills available as /claudekit:<name> (15 total)
  - Agents available as claudekit:<name> (8 specialists)
  - Output styles available via /config (5 shipped: Brainstorm, Deep Research,
    Implementation, Review, Token Efficient)
```

---

## --all Flag

If `$ARGUMENTS` contains `--all`, skip all prompts and install everything:
- All 5 rules
- All 5 hooks
- All 5 MCP servers

---

## Important Rules

- **NEVER overwrite existing files without asking.** If a target file already exists, ask: "[filename] already exists. Overwrite? (y/n)"
- **Create directories as needed.** If `.claude/rules/` doesn't exist, create it before writing files.
- **For hooks, always use `settings.local.json`** (not `settings.json`) — local is gitignored so hook config stays personal.
- **Use `${CLAUDE_PLUGIN_ROOT}`** to reference template files within the plugin.
- **Platform detection for MCP**: Windows uses `cmd /c npx`, macOS/Linux uses `npx` directly.
- **Output styles are NOT scaffolded by init.** They ship with the plugin at `output-styles/` and are auto-discovered. Users switch them via `/config` or by setting `outputStyle` in `.claude/settings.local.json`.
