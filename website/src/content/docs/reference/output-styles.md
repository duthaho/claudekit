---
title: Output Styles Reference
description: 5 native Claude Code output styles shipped with Claude Kit.
---

# Output Styles Reference

Claude Kit ships 5 [Claude Code output styles](https://docs.claude.com/en/docs/claude-code/output-styles) — system-prompt overlays that change how Claude communicates and reasons for the entire session. Output styles are auto-discovered when the plugin is installed; no `/claudekit:init` step required.

All 5 styles use `keep-coding-instructions: true`, so Claude's default coding/testing/verification discipline still applies underneath. The style adds posture and format on top.

## Switching styles

### Via `/config` (recommended)

```
/config
```

Pick **Output style** from the menu, then choose one of the 5 styles. The choice persists across sessions.

### Via settings file

Edit `.claude/settings.local.json` (project) or `~/.claude/settings.json` (personal):

```json
{
  "outputStyle": "Brainstorm"
}
```

### Built-in vs claudekit styles

Claude Code has built-in styles (`Default`, `Explanatory`, `Learning`). Claudekit adds 5 more: `Brainstorm`, `Deep Research`, `Implementation`, `Review`, `Token Efficient`. They appear together in the `/config` picker.

---

## The 5 styles

### Brainstorm

Creative exploration mode — divergent thinking, multiple alternatives, structured trade-offs before any code.

- **Posture**: Diverge first, converge second. Surface 2-3 distinct approaches before recommending one.
- **Output format**: Lettered approaches with pros / cons / effort, then a one-line recommendation.
- **Best for**: Feature design, architecture decisions, exploring alternatives.

```
APPROACH A: <name>
  Summary: <1 sentence>
  Pros: ...
  Cons: ...
  Effort: <S/M/L/XL>

APPROACH B: <name>
  ...

RECOMMENDATION: <which one and why>
```

### Deep Research

Thorough investigation mode — completeness over speed, evidence-cited findings, confidence levels named.

- **Posture**: Cite, don't recall. Every claim has a source — `file:line`, doc URL, or command output.
- **Output format**: Structured reports with Question / Method / Findings (with confidence) / Conclusions / Gaps.
- **Best for**: Technology evaluation, incident investigation, security audits, due diligence.

### Implementation

Code-focused execution mode — minimal prose, action-oriented updates, follow established patterns.

- **Posture**: Execute, don't deliberate. The decisions were made upstream.
- **Output format**: Per-file edits with code blocks, then test-run output, then commit.
- **Best for**: Executing approved plans, repetitive tasks, when design is already decided.

```
Creating `src/services/user-service.ts`
[code]

Running tests... ✓ 5 passing
Committing: feat(user): add user service
```

### Review

Critical analysis mode — find issues first, severity-tagged findings, actionable suggestions.

- **Posture**: Find first, fix second. A reviewer's job is to surface issues with concrete `file:line` locations.
- **Output format**: Findings tagged Critical / Important / Minor / Nitpick with file citations.
- **Best for**: Pre-merge code review, security audits, architecture review.

```
### Critical (must fix before merge)
1. **<issue>** — `file:line`
   - Problem: ...
   - Fix: ...
```

### Token Efficient

Compressed output mode — minimal prose, code-first, no preambles.

- **Posture**: Skip ceremony. No "Sure, I can help" / "Let me explain first" — just do.
- **Output format**: Code blocks with one-line captions; reference docs instead of re-explaining mechanism.
- **Best for**: High-volume sessions, repeated similar tasks, cost-conscious work.
- **Saving**: 40-60% on average vs default verbosity.

---

## Style comparison

| Style | Verbosity | Focus | Output shape |
|-------|-----------|-------|-------------|
| Brainstorm | High | Exploration | Approach tables + trade-offs |
| Deep Research | High | Analysis | Structured reports with citations |
| Implementation | Low | Execution | Code-first per-file blocks |
| Review | Medium | Quality | Severity-tagged issue lists |
| Token Efficient | Minimal | Density | Code with one-line captions |

## Customizing

Output styles are markdown files at the plugin root in `output-styles/`. To customize, copy the file you want to modify into `.claude/output-styles/<name>.md` (project) or `~/.claude/output-styles/<name>.md` (personal). Project styles override personal styles, which override plugin-shipped styles.

Format:

```yaml
---
name: My Custom Style
description: A short description shown in the /config picker
keep-coding-instructions: true
---

# My Custom Style

[behavioral instructions...]
```

Set `keep-coding-instructions: false` if you want to fully replace Claude's default coding discipline (rare; usually leave it `true`).
