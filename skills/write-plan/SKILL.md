---
name: write-plan
user-invocable: true
description: >
  Use after a spec exists and before any implementation code is written. Activate for
  keywords like "plan", "break down", "decompose", "implementation plan", "task list",
  "what's the order". Produces a numbered task list where each task names the file,
  the change, the test, and what evidence proves it's done. Always cite file paths
  and exact commands -- never write a plan with placeholder verbs like "implement"
  or "set up".
---

# Write Plan

## Overview

A workflow for converting a spec into an executable plan: a numbered list of tasks,
each with a file path, an exact change, a test command, and an acceptance check.
The skill exists because the most common implementation failure is starting from a
plan that says "implement the cache" and discovering at code-review time that
"implement" hid four sub-decisions nobody made. A plan written through this skill
makes those decisions visible up front. Each task is small enough that a different
engineer could pick it up cold; the entire plan is small enough that the spec's
acceptance criteria are obviously reachable from it. Used after `shape-spec`,
before code or `plan-review`.

## When to Use

- A spec has been approved and you're about to start coding
- The work will span more than one PR or take more than a day
- More than one person will work on the change
- You're handing the work off to a teammate and need them to start without you in
  the room
- You ran `plan-review` and the reviewer said the plan is too vague to evaluate

## When NOT to Use

- The change is **Trivial** (one-line / single-file / describable in one sentence) — skip planning, make the change, run `verification-gate`
- A plan exists; you should be running `plan-review` against it, not rewriting it
- You don't have a spec yet and the change is **Standard** — go to `shape-spec` first

## Process

**Effort tier:** planning is for **Small** and **Standard** changes. A **Small**
change (≤ ~3 files, obvious design) needs only a lightweight inline plan — the
task list and per-task acceptance check below, skipping the spec that fed it. A
**Standard** change gets the full plan and then `plan-review`. **Trivial** changes
skip this skill entirely. Either way `verification-gate` and `code-review-loop`
still run — planning scales, the gate does not. (Full tier table: README "Sizing
the work".)

### Step 1: Confirm the spec is sufficient

**Goal:** Avoid planning against a spec that itself is incomplete.

**Inputs:** The spec produced by `shape-spec` (or equivalent).

**Actions:**

1. Read the spec. Check that Goals, Non-Goals, Constraints, and Acceptance Criteria
   sections are all populated.
2. For each Acceptance Criterion, write down — in your scratch space, not the plan
   — the rough engineering work needed to satisfy it. If you can't, the criterion
   is too vague; return to `shape-spec`.
3. Note any constraint that requires research before tasks can be written
   (e.g., "must work with the legacy auth middleware" — does it?). Mark these
   as Step 0 tasks.

**Output:** Confirmation note `Spec sufficient` or a list of return-to-spec items.

### Step 2: Decompose into tasks

**Goal:** Generate a flat numbered task list. No sub-tasks; flatness forces honesty
about size.

**Inputs:** The spec's Acceptance Criteria.

**Actions:**

1. For each criterion, list the engineering work needed: data model changes,
   handler changes, tests, configuration, documentation, deploy steps.
2. Order tasks by data flow: schema/config first, then handlers, then UI, then
   tests if not test-first. Reorder if the project uses TDD (test first).
3. Each task is on one line in this form:
   `<N>. <file_path> — <verb> <specific change>. Test: <command>.`
4. If a task line exceeds ~120 characters or you can't name a single test
   command, the task is too large. Split it.

**Output:** A numbered, flat task list in a Markdown file at
`docs/claudekit/plans/<spec-basename>-plan.md`.

### Step 3: Annotate dependencies and parallelism

**Goal:** Make the order of operations explicit.

**Inputs:** The task list from Step 2.

**Actions:**

1. For each task, note tasks that **must complete first** (dependencies).
2. For each task, note tasks that **can run in parallel** (no shared file, no
   shared state).
3. Add a `Blocked by: <task numbers>` and `Parallel with: <task numbers>` line
   under each task that has either.
4. If the dependency graph has a long single chain (everything blocks on task 3),
   the work is not parallelizable; tell the reader that explicitly so they don't
   try to fan out.

**Output:** Each task annotated with dependency and parallelism metadata.

### Step 4: Add acceptance check per task

**Goal:** Define what "this task is done" means concretely, so the implementer
knows when to move on and the reviewer knows what to look for.

**Inputs:** The task list from Step 3.

**Actions:**

1. For each task, append an `Acceptance:` line with a concrete observable check.
   - For code tasks: a specific test passing OR a specific behavior observable
     in the running app.
   - For schema tasks: the migration applies cleanly to a snapshot of prod data.
   - For docs tasks: the doc renders, the link is valid, the example runs.
2. The acceptance check is what the implementer pastes into the PR description
   for that task.

**Output:** Each task has an `Acceptance:` line.

### Step 5: Risk and rollback notes

**Goal:** Surface the parts of the plan that could go wrong.

**Inputs:** The fully annotated task list.

**Actions:**

1. Add a `## Risks` section at the bottom of the plan. List each task that:
   - Touches production data
   - Modifies a shared schema
   - Changes a public API contract
   - Requires a deploy in a specific order with another service
2. For each risk, write a one-line rollback procedure.
3. If a task has no rollback (e.g., destructive migration), write
   `Rollback: NOT POSSIBLE — see plan-review-architecture` and flag for the
   architecture reviewer.

**Output:** A Risks section. Plan ready for `plan-review`.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "I'll figure out the file paths when I get there." | The plan is for high-level sequencing, not low-level layout. | Plans without file paths are wishlists. They survive review by saying "implement the X" and rot at implementation time when the engineer realizes "X" actually splits across three files with conflicting conventions. The decisions you defer to "when I get there" are the decisions plan-review exists to catch. | Name the file path even if it doesn't exist yet. `src/handlers/billing/charge.ts (new)` is fine. Naming forces you to think about layout before you've written any code. |
| "Test commands will be obvious." | If the project has one test runner, every task uses it; explicit naming feels redundant. | "Obvious" assumes the implementer is you, today. A teammate (or you, in three weeks) won't remember whether this task wants `pytest -k` or the integration suite or the contract test. Naming the exact command in the plan saves the implementer one round trip and avoids the "I ran the wrong tests" PR. | Paste the exact command. `pytest tests/billing/test_charge.py -k test_idempotency`. If three tasks have the same command, that's fine; copy-pasting is cheap. |
| "Acceptance is just 'tests pass.'" | TDD culture tells us tests are the contract. | "Tests pass" is necessary, not sufficient. A task can pass tests and still not satisfy the acceptance criterion if the test was scoped wrong, the wrong cases were covered, or the criterion includes something tests don't catch (a UX flow, a perf budget, a doc update). The acceptance line names *which* observable thing proves the task done. | Write the acceptance line as: "Test X passes AND when I run Y in dev, I see Z." Most tasks need both halves. |
| "I don't need parallelism notes — we'll figure it out as we go." | Most plans are executed sequentially anyway. Annotating parallelism for a one-person project is overhead. | The annotation is cheap; the absence is expensive when a second person joins or the same engineer wants to pick the next task while CI runs the previous one. The cases where parallelism notes don't matter are also the cases where adding them takes 60 seconds. | If the plan has more than 5 tasks, add the parallelism notes. They're not for the first author; they're for whoever is on the project a week from now. |
| "Rollback is the deploy team's problem." | Some risks really do live in the deploy step, owned by SRE / ops. | "Their problem" assumes someone else has the context to write the rollback. They don't. The engineer who wrote the migration knows what to undo; SRE can run the rollback but can't author it. The plan owner is the right author of the rollback note. | Write the one-line rollback yourself. If you don't know what it would be, you don't know what risk you're taking. Flag it; don't punt it. |
| "This change is tiny, but I'll write the full multi-task plan to be safe." | Thoroughness feels like the safe default, and a plan never hurts. | A five-task plan for a one-file change is ceremony that trains you and your reviewers to treat the plan as theater — and theater gets skipped next time, including on the Standard change that needed it. Over-applying the process erodes it as surely as skipping it does. | Size the change (README "Sizing the work"). A **Small** change gets the lightweight inline plan — the task list and per-task acceptance check, nothing more; a **Trivial** one skips planning entirely and goes to `verification-gate`. Save the full plan for Standard work. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | A `Spec sufficient` confirmation OR a list of items to return to the spec | "I read the spec, I think it's fine." |
| End of Step 2 | A flat numbered task list with file paths and exact test commands | "Step 1: implement the feature." |
| End of Step 3 | Each task annotated with `Blocked by` / `Parallel with` (where applicable) | "We'll figure out the order during implementation." |
| End of Step 4 | Each task has an `Acceptance:` line with concrete observable check | "Tests pass." |
| End of Step 5 | A `## Risks` section with rollback notes for high-risk tasks | "We'll deal with rollback if it comes up." |

## Red Flags

- The plan has fewer than 3 tasks. You wrote a TODO, not a plan.
- The plan has more than 30 tasks. The spec is too big or the tasks are too small;
  collapse the trivial ones or split the spec.
- A task has no `Acceptance:` line. You don't know how the implementer will know
  they're done.
- The dependency graph is one long chain. Either the work isn't parallelizable
  (say so) or you missed parallelism opportunities.
- Multiple tasks reference the same file with conflicting changes (one adds,
  another modifies, a third removes). Order them, or the second engineer to pick
  one will face a merge conflict the plan invented.
- The plan and the spec have drifted. A goal in the spec has no corresponding
  task in the plan, or vice versa. Reconcile before review.

## References

- *Software Engineering at Google*, Wright et al. (O'Reilly, 2020), Chapter 9
  "Code Review" — the principle "small, focused changes" applied at the planning
  level, not just at the PR level. A plan whose tasks are small enough to merge
  individually produces PRs small enough to review individually.
