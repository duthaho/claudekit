---
name: incremental-shipping
user-invocable: true
description: >
  Use when implementing a non-trivial feature, migration, or refactor that would
  otherwise be a single large change. Activate for keywords like "feature flag",
  "incremental", "vertical slice", "migration", "rollout", "behind a flag", "ship
  small". Enforces vertical slicing, feature-flagged rollout, and refactor-with-
  evidence (behavior-preserving changes proved by test/perf deltas). Always ship
  the smallest reversible change -- never bundle unrelated improvements.
---

# Incremental Shipping

## Overview

A workflow for landing large changes as small, reversible increments. The skill
exists because the most common shipping failure isn't a missing test or a bad
deploy — it's a 1500-line PR that bundles a feature, a refactor, and a config
change, takes three days to review, and lands with a regression nobody isolated.
Incremental shipping splits that into thin vertical slices behind feature flags,
plus a refactor-with-evidence section for behavior-preserving changes that need
their own discipline (test deltas, perf measurements). Used after `write-plan`
and `test-first`, before `code-review-loop`.

## When to Use

- A feature plan has 5+ tasks and would otherwise ship as one PR
- A migration must run alongside existing code for a transition period
- A refactor changes structure but should preserve behavior; you need to prove it
- A change is risky enough that you want a kill switch in production

## When NOT to Use

- The change is single-file and trivially reversible (`git revert` is enough)
- The change has no observable surface (internal-only refactor of a single
  function called by tests)
- An emergency hotfix where the cost of incrementality exceeds the cost of risk

## Process

### Step 1: Identify the vertical slice

**Goal:** Define the smallest change that delivers user-observable value (or
preserves behavior, for refactors) and can ship on its own.

**Inputs:** A task or set of tasks from your plan.

**Actions:**

1. Ask: what's the smallest version of this change that a user could see, an
   API consumer could call, or a test could exercise? Not "the smallest piece of
   code" — the smallest *value-delivering* slice.
2. List what would be excluded from this slice: features, edges, polish.
   Excluded items become later slices.
3. The slice should be implementable in 1-3 PRs of <300 lines each.

**Output:** A slice definition: `Slice 1: <what's included>; out of slice:
<what's deferred>`.

### Step 2: Add the feature flag

**Goal:** A kill switch that lets the slice ship dark.

**Inputs:** The slice definition.

**Actions:**

1. Choose a flag name. Convention: `<feature>_enabled` for booleans,
   `<feature>_rollout` for percentage rollouts.
2. Wire the flag to a config source (env var, feature-flag service, config file).
3. Default the flag to **off**. The slice ships off, gets verified in production
   off, then turned on.
4. Write a comment at the flag's read site naming the deletion plan: `// Remove
   this flag and the off branch after rollout completes — see ticket <link>`.

**Output:** Flag is committed (off-by-default), readable from production.

### Step 3: Implement the slice

**Goal:** Code that delivers the slice, gated by the flag.

**Inputs:** The slice definition + the flag.

**Actions:**

1. Implement following `test-first`. Each test runs both flag-on and flag-off
   paths if behavior diverges.
2. Branch on the flag at one well-named location, not scattered. The off branch
   reproduces existing behavior; the on branch implements the slice.
3. Avoid bundling: if you spot an unrelated cleanup (typo, lint, dead code),
   write it down for a follow-up PR. Don't include it now.

**Output:** Slice implementation behind the flag, all tests pass.

### Step 4: Refactor with evidence (when applicable)

**Goal:** Structural changes that preserve behavior, proved by deltas.

**Inputs:** A refactor opportunity revealed during Step 3 OR a separate refactor
task in the plan.

**Actions:**

1. Before refactoring: run the test suite and capture the green output. This is
   the **before-state**.
2. If perf-sensitive: run the relevant benchmark. Capture the number. (Bench tool
   varies; the project's standard.)
3. Make the structural change. One change at a time — don't bundle multiple
   refactors.
4. After refactoring: run the test suite. Confirm green. This is the **after-state**.
5. If perf-sensitive: re-run the benchmark. The delta must be within the project's
   tolerance. If perf regresses, revert and rethink.
6. Paste before/after test output and (if applicable) perf numbers in the PR.
   "Refactor with evidence" means the evidence is in the PR, not in your head.

**Output:** Refactored code + before/after evidence in the PR.

### Step 5: Ship the slice

**Goal:** Land the slice in production with the flag off, then turn it on.

**Inputs:** Slice implementation + tests.

**Actions:**

1. Land the PR with the flag off. The merge is dark — production behavior is
   unchanged because the off branch reproduces existing behavior.
2. Verify in production with flag off (regression check — did anything break that
   we didn't gate properly?).
3. Turn the flag on. Start with internal users / a small percentage / a single
   tenant.
4. Monitor: error rates, p95 latency, business metrics relevant to the slice.
   If anomalies appear, flip the flag off — that's the kill switch's job.
5. Ramp up. 1% → 10% → 50% → 100% over hours or days, depending on risk.

**Output:** Slice fully rolled out OR rolled back via flag with a learning.

### Step 6: Plan the next slice or remove the flag

**Goal:** Close the loop on this slice.

**Inputs:** A 100% rollout that's been stable for the project's bake-time
(typically 1 release cycle).

**Actions:**

1. If more slices remain, return to Step 1 with the next slice.
2. If this was the last slice, delete the flag and the off branch. Open a
   "delete flag" PR. The flag's lifetime should be measurable in days/weeks, not
   months/years.
3. If the slice was reverted, write a one-paragraph learning: what assumption
   was wrong, what evidence revealed it, what would have caught it earlier.

**Output:** Either a new slice in flight or a flag-removal PR or a learning
note.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "Feature flags add complexity — let's just ship it." | Flags do add code paths and require maintenance. | "Just ship it" without a flag is fine for trivial changes; for the cases this skill applies to, the flag is the difference between a 30-second rollback and a 2-hour incident. The complexity of one well-placed flag is fixed and small; the complexity of fixing prod with no kill switch is unbounded. | Add the flag. The cost of one branch and one config read is the cheapest insurance you'll buy. Delete the flag after rollout (Step 6) so the complexity is temporary. |
| "I'll bundle this small cleanup with the feature — saves a PR." | Reducing PR count feels efficient. | The bundled cleanup is the change that breaks the PR review. The reviewer can't tell which lines are feature and which are cleanup; they ask questions about both, you answer for both, the review takes 2x as long. If the cleanup introduces a regression, bisect points to a commit that mixes feature and cleanup, doubling the debugging time. | Open a separate PR for the cleanup. The two PRs together review faster than one mixed PR. The reviewer can approve the cleanup with a glance and focus attention on the feature. |
| "Refactor first, then add the feature." | Clean code makes adding features easier. | Refactor-then-feature lands a refactor with no feature-driven verification. The "behavior-preserving" claim is unverified at the only test that matters — the feature exercising the refactored area. The refactor ships, looks fine, and the feature later reveals that the refactor changed behavior in a path tests didn't cover. | Make the change you need (the feature), then refactor afterward if needed, with the feature's tests as your safety net. Or: refactor and pass Step 4's evidence check (before/after deltas) explicitly. Don't refactor without evidence. |
| "I'll roll out to 100% directly — no point in 1%." | Gradual rollout has overhead and most slices are fine at 100%. | The cost of "no point in 1%" is a 100% rollout when the slice happens to have a regression. The 1% step would have surfaced the issue with 1% of the blast radius. Skipping the gradual ramp on the 95% of safe changes is fine; the discipline is needed for the 5% where it's not. | Default to a gradual ramp. If the change is small enough that 100% is genuinely safe, you can shorten the ramp (1% for 5 minutes, then 100%) but don't skip the verification step. |
| "I'll keep the off branch in code as a fallback even after rollout." | Fallback paths feel like safety. | Long-lived dual-path code becomes the ambiguity nobody understands six months later. The off branch is dead in production but alive in tests, in code review, in mental load. Every modification has to consider both paths. The "safety" you preserved is paid for forever. | Set a deletion deadline at the flag's introduction (Step 2 comment). When 100% rollout has baked, delete the flag and the off branch. If the change ever needs to be undone, `git revert` does the work — that's why version control exists. |
| "The refactor's behavior preservation is obvious — no need for the perf benchmark." | Many refactors really don't change perf. | "Obvious" without measurement is the line said before someone discovers the refactor changed an O(n) loop into an O(n²) one because of a hidden re-evaluation. Perf regressions from refactors are surprisingly common because the refactor optimized for readability, not for the compiler's hot path. | If the code is in a perf-sensitive area (request handler, hot loop, batch job), run the benchmark before and after. The delta is the receipt. If it's truly cold path, you can skip — but say so explicitly in the PR ("perf not measured; cold path"). |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | A slice definition naming what's included and what's deferred | "I'll start coding and see how big it gets." |
| End of Step 2 | A feature flag committed off-by-default with a deletion-plan comment | "We can add the flag later if needed." |
| End of Step 3 | Tests pass; flag-on and flag-off paths both exercised by tests | "It works behind the flag." |
| End of Step 4 (refactor) | Before/after test runner output + (if applicable) perf benchmark numbers | "Refactor preserves behavior — trust me." |
| End of Step 5 | Rollout sequence with monitoring observations at each ramp step | "It's at 100%, looks fine." |
| End of Step 6 | Either a flag-removal PR or a written learning from a revert | "We'll get to flag cleanup eventually." |

## Red Flags

- The slice is more than 500 lines of diff. It's not a slice; it's a feature.
  Split it.
- The feature flag has no deletion plan. The flag will outlive the feature.
- Step 4's "after" benchmark is missing because "perf isn't a concern here." If
  the code runs in production, perf is always a concern; document the cold-path
  decision explicitly.
- The rollout went directly from 0% to 100%. Either the slice was trivial (was
  the flag needed?) or the discipline was skipped.
- The PR contains both a feature gate and a "while I was here" cleanup. Split
  before review.
- Multiple flags in flight for related slices and you can't remember which is
  which. Slow down; the flag-cycle is supposed to be short.

## References

- Martin Fowler, *Refactoring* (Addison-Wesley, 2nd ed. 2018), Chapter 1
  "Refactoring: A First Example" — the principle "make the change easy, then
  make the easy change" applied to vertical slicing. Step 4's
  refactor-with-evidence operationalizes Fowler's "test before, test after"
  rule with explicit artifact capture.
- Pete Hodgson, "Feature Toggles" (martinfowler.com, 2017) — the categorization
  of release toggles vs. permission toggles, plus the discipline that release
  toggles should have a short lifetime. Step 6's deletion requirement
  operationalizes that discipline.
