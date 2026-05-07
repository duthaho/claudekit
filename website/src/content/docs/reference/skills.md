---
title: Skills Reference
description: 16 skills in Claude Kit organized around the 5-phase verification-first workflow.
---

# Skills Reference

Claude Kit is organized around a **5-phase verification-first workflow**: Investigate → Design → Implement → Verify → Ship. All 14 spine skills (plus 2 setup skills) are user-invocable as `/claudekit:<name>`.

Every skill has 8 required sections: Frontmatter, Overview, When to Use, Process, **Rationalizations table**, **Evidence Requirements**, Red Flags, References. The Rationalizations pattern documents the excuses an engineer makes to skip a step (verbatim) with rebuttals. The Evidence Requirements name what artifact each checkpoint must produce.

## How Skills Work

Skills have trigger descriptions with keywords. When your conversation matches, the skill loads automatically:

```
"why is this broken?"     → investigate-root-cause
"how does X work?"        → map-codebase
"plan this feature"       → shape-spec, write-plan
"review the plan"         → plan-review (dispatches architect + experience reviewer)
"is it done?"             → verification-gate
"open a PR"               → code-review-loop
"cut a release"           → release-and-changelog
```

You can also invoke any skill directly by typing `/claudekit:<name>`.

---

## 🔍 Investigate

Surface every fact about the system before forming a theory. Every claim has a `<file:line>` citation; no memory-based assertions.

| Skill | Description | Triggers On |
|-------|-------------|-------------|
| **investigate-root-cause** | 4-phase: gather → hypothesize → test → prove. Mandatory before any fix. | "bug", "error", "broken", "why does this", stack traces |
| **map-codebase** | Methodical evidence-cited exploration. Produces a written map a teammate can read in 3 minutes. | "how does X work", "trace", "find where", "scope of change" |
| **audit-dependencies** | Dependency archaeology — what's actually used vs declared, with import-graph and reachability checks for CVEs. | "deps", "audit", "CVE", "stale package", "do we use" |

## 🎨 Design

Convert a vague request into a written spec, then a numbered plan, then survive review before implementation begins.

| Skill | Description | Triggers On |
|-------|-------------|-------------|
| **shape-spec** | One-to-three-page spec with goals, non-goals, constraints, falsifiable acceptance criteria, open questions. Engineering-flavored. | "spec", "what should we build", "design this", "let's add" |
| **write-plan** | Numbered task list with file paths, exact test commands, dependency annotations, acceptance per task, Risks section. | "plan", "break down", "task list", "implementation order" |
| **plan-review** | Orchestrator: dispatches 2 reviewers in parallel, consolidates into one fix gate, applies user-selected fixes. | "review the plan", "is the plan ready", "plan-review" |
| **plan-review-architecture** | Scores 5 sub-dimensions 0-10 (data flow, failure modes, edge cases, test matrix, rollback). | "architecture review", "data flow", "failure modes", "rollback" |
| **plan-review-experience** | Scores 5 sub-dimensions 0-10 (info hierarchy, state coverage, accessibility, DX ergonomics, AI-slop avoidance). | "UX review", "DX review", "API ergonomics", "states", "accessibility" |

## 🔨 Implement

Ship code with red-green-refactor discipline; vertical slices behind feature flags; refactor with evidence.

| Skill | Description | Triggers On |
|-------|-------------|-------------|
| **test-first** | Red-green-refactor with strict evidence requirements. | "implement", "fix bug", "TDD", "write the test first" |
| **incremental-shipping** | Vertical slices behind feature flags plus refactor-with-evidence (test/perf deltas required). | "feature flag", "incremental", "vertical slice", "rollout" |

## ✅ Verify

Mandatory pre-completion gate. No "tests pass — trust me." Active debugging keeps a paper trail.

| Skill | Description | Triggers On |
|-------|-------------|-------------|
| **verification-gate** | 6-step pre-completion gate: claim → tests → negative path → non-IDE check → cross-check → sign. | "done", "complete", "ready to merge", "tests pass" |
| **evidence-driven-debugging** | Active-debugging companion to investigate-root-cause: instrument, capture, verdict, clean up. | "debug", "instrument", "log", "trace", "what's happening at runtime" |

## 🚀 Ship

Reviewable PRs with verification evidence pasted; atomic releases with diff-built changelogs.

| Skill | Description | Triggers On |
|-------|-------------|-------------|
| **code-review-loop** | End-to-end review etiquette: requesting and receiving feedback. Dispatches code-reviewer and (on sensitive paths) security-auditor. | "code review", "PR review", "request review", "address comments" |
| **release-and-changelog** | SemVer hygiene plus diff-built changelogs plus atomic release commits plus post-release smoke check. | "release", "version bump", "changelog", "tag", "publish" |

---

## ⚙️ Setup (off-spine)

Used once for project bootstrap, plus session-level mode switching.

| Skill | Description | Triggers On |
|-------|-------------|-------------|
| **init** | Interactive setup wizard — scaffolds rules, hooks, and MCP configs into your project | `/claudekit:init` |

To switch session behavior (Brainstorm, Implementation, Review, etc.), use Claude Code's native [output styles](/reference/output-styles/) instead of a skill — switch via `/config`.
