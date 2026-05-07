---
name: plan-review-architecture
user-invocable: true
description: >
  Architecture-dimension reviewer for written plans. Use when running plan-review
  or directly when an architectural review is wanted. Activate for keywords like
  "architecture review", "data flow", "failure modes", "rollback", "edge cases",
  "test matrix". Scores 5 sub-dimensions 0-10, produces ranked fixes. Always cite
  file paths or task numbers from the plan -- never write generic architectural
  advice.
---

# Plan Review — Architecture Dimension

## Overview

The architecture-dimension reviewer for `plan-review`. Reads a plan and scores
five concrete sub-dimensions on 0-10: data flow, failure modes, edge cases, test
matrix, and rollback safety. Every score must be paired with a finding citing the
plan task number or section that caused the score. The skill produces a ranked
fix list aligned with `plan-review`'s consolidation step. Used by `plan-review`'s
orchestrator, but invocable directly when only an architectural review is needed.

## When to Use

- Invoked by `plan-review` as one of its two parallel reviewers
- The user wants an architectural pass on a plan without the experience review
- A plan has been edited substantially in architectural areas and needs re-scoring

## When NOT to Use

- The plan is single-task or single-file (architecture review is overkill)
- You haven't read the underlying spec; architecture findings without spec
  context produce noise

## Process

### Step 1: Pre-read

**Goal:** Build context before scoring.

**Inputs:** The plan file. Optionally: the spec it's derived from, the relevant
codebase area.

**Actions:**

1. Read the spec (if available) for goals, non-goals, constraints, acceptance
   criteria.
2. Read the plan end to end.
3. Run `map-codebase` mentally on the affected area: which files, which entry
   points, which downstream services or queues.

**Output:** A short pre-read note: `Plan touches <areas>; primary risks I'll watch
for: <list>`.

### Step 2: Score the five sub-dimensions

**Goal:** Produce 5 scores with cited findings.

**Inputs:** The plan file plus pre-read notes.

**Actions:** For each sub-dimension below, score 0-10 and write at least one
finding. Findings must cite the plan task number or section.

1. **Data flow (0-10)**
   - Is the plan explicit about who owns the data at each step?
   - Are reads and writes ordered correctly across services?
   - Are eventual-consistency boundaries marked?
   - Score 10 = data flow is unambiguous from the plan alone.
   - Score 5 = a reader has to guess at one or more transitions.
   - Score 0 = data flow contradicts itself or the spec.

2. **Failure modes (0-10)**
   - For each external call (DB, queue, API), does the plan say what happens on
     failure?
   - Timeouts named?
   - Retry policy specified, including backoff and idempotency?
   - Circuit-breaker, fallback, or fail-closed behavior named?
   - Score 10 = every external interaction has a named failure path.
   - Score 5 = some failure modes addressed, others left to "we'll handle errors."
   - Score 0 = the plan assumes the happy path and stops.

3. **Edge cases (0-10)**
   - Empty inputs, max-size inputs, unicode, boundary values?
   - Concurrent access (race conditions, optimistic locking)?
   - Partial failure (one of N writes succeeds)?
   - Replays (idempotency on duplicate requests)?
   - Score 10 = edge cases enumerated and acceptance criteria cover them.
   - Score 5 = some named, others assumed-handled.
   - Score 0 = no edge case considered.

4. **Test matrix (0-10)**
   - Does each task have a named test command?
   - Are unit, integration, and contract tests differentiated where appropriate?
   - Are tests authored before or alongside the code (per the project's TDD posture)?
   - Are negative tests (invalid input, failure paths) included?
   - Score 10 = test coverage maps onto failure modes and edge cases line for line.
   - Score 5 = happy-path tests only.
   - Score 0 = "tests pass" without naming what tests.

5. **Rollback safety (0-10)**
   - For each high-risk task (schema changes, deploy ordering, config flips), is
     a rollback procedure named?
   - For destructive migrations, is the procedure flagged as `NOT POSSIBLE` and
     gated behind a feature flag, dual-write, or backfill?
   - Score 10 = every high-risk task has a one-line rollback.
   - Score 5 = some rollbacks named, others assumed.
   - Score 0 = no rollback considered; destructive change with no kill switch.

### Step 3: Rank findings as fixes

**Goal:** Convert each finding into a concrete fix proposal.

**Inputs:** The findings from Step 2.

**Actions:**

1. For each finding, write a fix in the form: `<task or section> — change
   <X> to <Y>` or `Add <Z> to <task or section>`.
2. Rank each fix by impact:
   - **Blocker** — without this, the plan is structurally unsafe to execute.
   - **Important** — without this, the plan will produce a regrettable result.
   - **Nice-to-have** — improves clarity but isn't load-bearing.
3. If a sub-dimension scores ≤4, the gap is almost always a blocker.

**Output:** A ranked list of fixes with cited targets in the plan.

### Step 4: Write the architecture report

**Goal:** Hand `plan-review` a clean, paste-ready report.

**Inputs:** Scores and ranked fixes.

**Actions:**

1. Produce a Markdown block with this structure:

   ```markdown
   ## Architecture review

   - Data flow: X/10 — <one-line justification>
   - Failure modes: X/10 — <one-line justification>
   - Edge cases: X/10 — <one-line justification>
   - Test matrix: X/10 — <one-line justification>
   - Rollback safety: X/10 — <one-line justification>

   ### Findings

   - [Blocker] <finding>; fix: <fix>; cite: <task #>
   - [Important] <finding>; fix: <fix>; cite: <task #>
   - [Nice-to-have] <finding>; fix: <fix>; cite: <task #>
   ```

2. Hand back to `plan-review` for consolidation with the experience reviewer.

**Output:** The Markdown block.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "I'll score by gut feel — calibration is a waste of time." | Experienced reviewers do have calibrated guts. | Gut-feel scoring without rubric anchors produces "everything's a 7" output the user cannot act on. The rubric anchors exist so the score communicates *which* gap is open, not just that something feels off. | Use the 0/5/10 anchors above. If a sub-dimension feels like a 7, that's actually a "5 with one gap closed" — name the open gap, score 6 or 7, and write the finding for it. |
| "I'll skip the citations — the user can find the relevant tasks." | Plans are short; finding the cited task is fast. | Findings without citations leave the user to do the matching, and they will skip findings that take work to verify. The citation is the cheapest part of the review for the reviewer and the most expensive part to reconstruct for the consumer. | Cite the task number or plan section in every finding. `Task 4 — failure mode for the cache miss is undefined` not `Cache failure modes are missing`. |
| "Rollback for this is obviously the deploy team's problem." | Some rollbacks are operational, owned by SRE. | "Obviously theirs" is the line you say when you don't know what the rollback is. The author of the change knows what would need to be undone; the deploy team knows how to undo it. The plan needs the *what*, not the *how*. | Even if SRE owns execution, the plan author writes one line: "Rollback: revert <commit>; re-run migration `down`; truncate <table>." If you can't write that line, escalate during review, don't skip during review. |
| "Edge cases score is low because edge cases are uncommon — that's fine." | Some edges genuinely never trigger in production. | "Uncommon" without measurement is a guess. Even uncommon edges hit at production scale (1-in-a-million × 1M req/day = 1/day). Scoring edge cases low because "they're uncommon" is the reviewer flinching from a real gap. | Score the edge case sub-dimension on whether the plan *names* the edges, not on whether you predict they'll trigger. The plan is responsible for surfacing the cases; ops decides which to handle. |
| "Test matrix is the tester's problem, not architecture's." | Test design and architecture are different specialties. | The test matrix is architectural in plans because the tests double as a check that the architecture's failure modes were considered. A plan with rich failure modes and thin tests is internally inconsistent — the tests don't exercise what the architecture promises. | Score the test matrix here. Cite the failure modes from sub-dimension 2 and confirm the test list (sub-dimension 4) covers them. The two scores should track each other; if they don't, that's a finding. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | Pre-read note naming areas touched and risks to watch | "I read the plan, looks like a backend change." |
| End of Step 2 | Five scores 0-10 each paired with at least one cited finding | "Looks mostly OK; some gaps." |
| End of Step 3 | Ranked fix list with `[Blocker/Important/Nice]` tags | "There are some things to improve." |
| End of Step 4 | The Markdown block exactly in the format above | A free-form summary the orchestrator has to re-format. |

## Red Flags

- Every score is 8-10. Either the plan is unusually strong (rare) or you're
  pattern-matching. Pick the weakest sub-dimension and find at least one finding
  worth flagging.
- A finding cites no task number. The reviewer is generating advice, not review.
- Test matrix score is much higher than failure modes score. Tests cover what
  isn't an architectural concern, or the architecture has gaps the tests don't
  exercise.
- All blockers come from the same sub-dimension. The plan has a concentrated
  weakness; consider whether the plan author needs help in that area before more
  fixes pile on.
- Rollback safety is 10/10 on a plan with destructive migrations. Verify by
  reading the actual rollback lines; "10/10" without specific procedures cited is
  a false positive.

## References

- Heroku, *Twelve-Factor App* (12factor.net) — the principles around config,
  backing services, and disposability inform sub-dimensions 1 (data flow) and 5
  (rollback safety). Cited at the rubric level, not skill level — when reviewing
  a plan that violates twelve-factor principles, name which factor.
