---
title: Agents Reference
description: The 8 specialist agents in Claude Kit — each with a single dispatcher and a narrow job.
---

# Agents Reference

Claude Kit ships **8 specialist agents.** Each agent has a single dispatcher (the skill that calls it) and a narrow job. No agent-bloat; no orphans.

## How Agents Work

When a skill needs deeper, focused work, it dispatches a specialist agent. The agent starts in a fresh context, does the focused job, and returns a structured result to the main conversation.

```
You: "Review this code for security issues"

→ /claudekit:code-review-loop dispatches
  → claudekit:security-auditor (sensitive path detected)
  → Focused OWASP-aligned review
  → Returns findings with severity + OWASP category
```

Agents can be dispatched in parallel — `plan-review` runs `architect` and `experience-reviewer` simultaneously.

---

## The 8 agents

| Agent | Job | Dispatched by |
|-------|-----|---------------|
| **claudekit:planner** | Decompose specs into executable plans (file paths, exact test commands, acceptance criteria, Risks section) | `write-plan` |
| **claudekit:architect** | Score architecture dimension of a written plan: data flow, failure modes, edge cases, test matrix, rollback safety | `plan-review-architecture` (via `plan-review`) |
| **claudekit:experience-reviewer** | Score UX + DX dimension: information hierarchy, state coverage, accessibility, DX ergonomics, AI-slop avoidance | `plan-review-experience` (via `plan-review`) |
| **claudekit:investigator** | Root-cause investigation with evidence chain — never guesses, never patches symptoms | `investigate-root-cause`, `evidence-driven-debugging` |
| **claudekit:tester** | Design and write tests with red-green discipline; pastes runner output as evidence | `test-first` |
| **claudekit:code-reviewer** | Pre-merge structural review of diffs: error handling, edge cases, complexity, naming. Defers sensitive paths to security-auditor | `code-review-loop` |
| **claudekit:security-auditor** | OWASP-aligned review of sensitive paths (auth, payments, crypto, sessions, tokens) | `code-review-loop` (sensitive paths only) |
| **claudekit:scout** | Codebase mapping and dependency audits — produces evidence-cited maps with `<file:line>` references for every claim | `map-codebase`, `audit-dependencies` |

---

## Custom agents

You can add project-specific agents in `.claude/agents/`. They follow the same YAML frontmatter format as bundled agents:

```yaml
---
name: my-agent
description: "When to dispatch this agent..."
tools: Read, Edit, Bash
memory: project
---

You are a [role] who [does what]. Your output is...
```

Agent design rules:

- **One dispatcher per agent.** No orphans. If you can't name the skill that dispatches the agent, the agent shouldn't exist.
- **Narrow job.** An agent that "helps with everything" helps with nothing.
- **Output format specified.** The skill consumes a known format; the agent produces it.
- **Refusal patterns named.** What the agent won't do is as important as what it will.
