---
title: Planning & Building
description: How Claude Kit takes you from a vague request to shipped, verified code.
---

# Planning & Building

The full feature loop: spec → plan → review → implement → verify. Each phase produces an artifact you could paste into a code review.

## Phase 1: Shape the spec

**Triggers on**: "spec", "what should we build", "design this", "let's add"

`shape-spec` turns a vague request into a written spec a teammate can read in 5 minutes. Goals, non-goals, constraints, falsifiable acceptance criteria, open questions. Engineering-flavored — no founder-mode forcing questions.

```
You: "We need to add idempotency to the charge endpoint"

→ /claudekit:shape-spec
  → asks clarifying questions, one at a time
  → produces docs/claudekit/specs/<basename>-spec.md
```

Output is a 1-3 page Markdown spec. The non-goals list is more important than the goals list — non-goals only get pinned down when you write them.

## Phase 2: Write the plan

**Triggers on**: "plan", "break down", "task list", "implementation order"

`write-plan` decomposes the spec into a numbered task list. Each task names the file, the change, the test command, the acceptance check, dependency annotations.

```
You: "/claudekit:write-plan"

→ produces docs/claudekit/plans/<basename>-plan.md
```

Each task line:

```
4. src/handlers/billing/charge.ts — add idempotency-key check before insert.
   Test: pytest tests/billing/test_charge.py -k test_idempotency
   Acceptance: duplicate request with same key returns the original response, no double charge
   Blocked by: 2 (schema migration)
```

Plans without file paths are wishlists; the skill refuses to ship those.

## Phase 3: Plan review

**Triggers on**: "review the plan", "is the plan ready", "plan-review"

`plan-review` orchestrates two parallel reviewers. Each scores 5 sub-dimensions 0-10 and proposes concrete fixes. Findings consolidate into one ranked fix gate.

| Skill | Dimensions scored | When to invoke |
|-------|------------------|----------------|
| `plan-review-architecture` | Data flow, failure modes, edge cases, test matrix, rollback safety | Architecture audit before coding |
| `plan-review-experience` | Information hierarchy, state coverage, accessibility, DX ergonomics, AI-slop avoidance | Plans with UI or API/CLI surfaces |
| `plan-review` | Both above, dispatched in parallel, consolidated single fix gate | Full review before handoff |

### Example

```
You: "/claudekit:plan-review"

→ dispatches architect + experience-reviewer in parallel

## Architecture review
- Data flow: 8/10
- Failure modes: 6/10 — Task 4: cache miss path undefined
- Edge cases: 7/10
- Test matrix: 7/10
- Rollback safety: 5/10 — Task 2: destructive migration without rollback

## Experience review
- Information hierarchy: 9/10
- State coverage: 6/10 — Task 7: no error state for failed charge
- Accessibility: 8/10
- DX ergonomics: 5/10 — Task 7: error message is "Internal error"
- AI-slop avoidance: 10/10

### Consolidated fixes (ranked)
- [Blocker] Task 2: add rollback procedure (destructive migration)
- [Blocker] Task 4: define cache miss failure path
- [Important] Task 7: define error state + actionable error copy
- [Nice-to-have] ...

> Which fixes to apply? [multi-select]
```

## Phase 4: Implement

**Triggers on**: "implement", "build", "add feature", "fix bug"

Each task ships with `test-first` (red-green-refactor) and `incremental-shipping` (vertical slices behind feature flags).

- **Test first.** Write the failing test, watch it fail for the right reason, make it pass with the smallest change, refactor with the test as safety net. Paste runner output for each step.
- **Vertical slices.** The smallest version of the change that delivers value, gated by a feature flag. Ship dark; ramp on.
- **Refactor with evidence.** Behavior-preserving changes prove preservation with before/after test deltas (and perf numbers if perf-sensitive).

## Phase 5: Verify

**Auto-triggers on**: completion claims ("done", "fixed", "tests pass", "ready to merge")

`verification-gate` is the load-bearing pre-completion check. Six steps, ~5 minutes:

1. Restate the claim: `<X> is complete because <Y>` (Y must be evidence, not "the code looks right").
2. Run named tests with full output. Paste it.
3. Run the negative path. Capture what happens on invalid input, missing field, network failure, max-size input.
4. Verify in a non-IDE environment. `curl` from a separate shell, not `npm run dev` in your editor.
5. Cross-check the original ask. Re-read the ticket; matrix what was asked to where it was addressed.
6. Sign the gate. Add a `## Verification` section to the PR with all of the above.

If the runner output isn't pasted, the gate hasn't run.

## Supporting skills

These activate automatically during planning and building:

| Skill | When it helps |
|-------|---------------|
| `map-codebase` | When you need to understand an unfamiliar area before shaping a spec or plan |
| `audit-dependencies` | Before adding a new third-party package, or after a CVE alert |

## Supporting agents

The skills above dispatch these agents:

| Agent | Role |
|-------|------|
| `planner` | Decompose specs into executable plans |
| `architect` | Score architecture dimension of a plan |
| `experience-reviewer` | Score UX + DX dimension of a plan |
| `tester` | Design and write tests with red-green discipline |

## Related pages

- [Testing & Debugging](/workflows/testing-and-debugging/) — `test-first` and root-cause investigation
- [Reviewing & Shipping](/workflows/reviewing-and-shipping/) — code review and release workflows
- [Skills Reference](/reference/skills/) — All 16 skills
