---
title: Installation
description: How to install Claude Kit as a Claude Code plugin.
---

# Installation

Claude Kit installs as a Claude Code plugin via a marketplace. Setup takes under 2 minutes.

## Prerequisites

- [Claude Code](https://claude.ai/code) installed and authenticated
- Node.js (for MCP servers, if you choose to configure them)

## Install the Plugin

### Step 1: Add the Marketplace

```
/plugin marketplace add duthaho/claudekit-marketplace
```

### Step 2: Install Claude Kit

```
/plugin install claudekit
```

That's it — all 15 skills and 8 agents are now available. Skills auto-trigger based on context; the 13 spine skills can also be typed as `/claudekit:<skill-name>`, and agents can be dispatched as `claudekit:<agent-name>`.

### Step 3: Configure Your Project (Optional)

Run the setup wizard to scaffold project-level configuration:

```
/claudekit:init
```

The wizard interactively installs:

| Category | What | Location |
|----------|------|----------|
| **Rules** | API, frontend, migrations, security, testing | `.claude/rules/` |
| **Modes** | brainstorm, deep-research, default, implementation, orchestration, review, token-efficient | `.claude/modes/` |
| **Hooks** | auto-format, block-dangerous-commands, detect-secrets, guard-sensitive-files, notifications | `.claude/hooks/` + `settings.local.json` |
| **MCP Servers** | Context7, Sequential, Playwright, Memory, Filesystem | `.mcp.json` |

Or install everything at once:

```
/claudekit:init --all
```

## Local Development

To test the plugin locally without the marketplace:

```bash
claude --plugin-dir ./path/to/claudekit
```

Use `/reload-plugins` to pick up changes without restarting.

## Verify Installation

After installing, skills trigger automatically based on your conversation:

```
You: "I need to add user authentication to our app"
     → triggers: claudekit:shape-spec, claudekit:write-plan

You: "There's a TypeError in the UserService"
     → triggers: claudekit:investigate-root-cause
```

You can also invoke skills manually:

```
/claudekit:shape-spec
/claudekit:init
```

## Updating

Update to the latest version:

```
/plugin marketplace update
```

## Troubleshooting

### Skills not triggering

Make sure the plugin is installed and enabled:

```
/plugin list
```

You should see `claudekit` in the list.

### MCP servers not working

MCP servers are only available after running `/claudekit:init` and selecting them. Verify your `.mcp.json` has the correct entries, then restart Claude Code.

### Plugin not found in marketplace

Make sure you've added the marketplace first:

```
/plugin marketplace add duthaho/claudekit-marketplace
```

## Next Steps

1. [Configuration](/getting-started/configuration/) — Customize rules, modes, and more via `/claudekit:init`
2. [Workflows](/workflows/planning-and-building/) — See how skills work together
