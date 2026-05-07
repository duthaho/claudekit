---
title: Introduction
description: A verification-first engineering toolkit for Claude Code. Built for senior ICs and tech leads.
---

# Introduction to Claude Kit

Claude Kit is a Claude Code plugin that adds a **verification-first engineering workflow** — every claim has evidence, every step has a checkpoint, every skill has a Rationalizations table that names the excuses an engineer makes to skip discipline. Built for senior ICs and tech leads who already know how to ship and want a workflow that keeps the bar high without ceremony.

## What is Claude Kit?

A Claude Code plugin you install via the marketplace:

- **15 Skills** — A 5-phase spine (Investigate → Design → Implement → Verify → Ship) plus 1 setup skill. All user-invocable as `/claudekit:<name>`. Each skill has 8 required sections including a Rationalizations table and Evidence Requirements.
- **8 Agents** — Specialist subagents, one dispatcher each. No agent-bloat.
- **5 Output Styles** — Native Claude Code output styles shipped with the plugin (Brainstorm, Deep Research, Implementation, Review, Token Efficient). Switch via `/config`.
- **Setup Wizard** — `/claudekit:init` scaffolds rules, modes, hooks, and MCP servers into your project.

Skills activate automatically based on keywords in your conversation, or invoke directly by name.

## Why Claude Kit?

### The problem with raw Claude Code workflows

| Problem | Symptom |
|---------|---------|
| **Self-reported "done"** | "Tests pass — trust me" claims that don't hold up |
| **Symptom patches** | Bugs fixed at the line where the error appeared, not at the cause |
| **Silent skip-it discipline** | Steps elided when the engineer thinks they "see the problem" |
| **Vague plans** | "Implement the X" tasks that hide three sub-decisions nobody made |

### What Claude Kit adds

1. **Rationalizations tables** — Every skill names the excuses someone makes to skip a step ("I see the problem, let me just patch it") with rebuttals. The skill refuses to be skipped silently.
2. **Evidence Requirements** — Every checkpoint produces an artifact you could paste into a code review. "It seems right" is failure.
3. **Pre-completion gates** — `verification-gate` runs before any "done" claim. Tests run. Negative path checked. Non-IDE environment exercised. Original ask cross-checked.
4. **Plan-review pipeline** — Two parallel reviewers (architecture + experience) score 5 sub-dimensions each, consolidate into one fix gate. Catches structural issues before code.
5. **No founder voice** — No "ambitious vision," no "10x outcomes," no "delight." Engineering analogies, real file paths, real commands.

## How skills work

Skills trigger automatically based on keywords, or you can invoke them directly:

```
You: "Why is this endpoint returning 500s?"
     → triggers: investigate-root-cause

You: "How does the auth flow work?"
     → triggers: map-codebase

You: "Plan the migration to PostgreSQL"
     → triggers: shape-spec, then write-plan, then plan-review

You: "Is this PR ready to merge?"
     → triggers: verification-gate, then code-review-loop
```

Or invoke directly: `/claudekit:investigate-root-cause`, `/claudekit:plan-review`, `/claudekit:verification-gate`.

## Who is Claude Kit for?

- **Senior ICs** who want a workflow that respects how they already think — not founder-flavored coaching, not "magical AI" framing.
- **Tech leads** running plan reviews, code reviews, and engineering rigor across teams. Plan-review is the headline workflow.
- **Anyone using Claude Code** who's tired of self-reported "done" claims and wants a discipline that produces evidence.

## What Claude Kit isn't for

- Pure exploratory work where the goal is learning, not shipping.
- One-line typo fixes that don't need a workflow.
- Strategy / scope / "is this worth building" questions — that's a different lane.

## Next steps

1. [Install Claude Kit](/getting-started/installation/) — Install the plugin from the marketplace.
2. [Configuration](/getting-started/configuration/) — Run `/claudekit:init` to scaffold rules, modes, hooks, and MCP servers.
3. [Skills Reference](/reference/skills/) — Browse the 16 skills.
4. [Agents Reference](/reference/agents/) — Browse the 8 specialist agents.
