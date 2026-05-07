---
name: plan-review
user-invocable: true
description: >
  Use after a plan exists and before any implementation begins. Activate for
  keywords like "review the plan", "check this plan", "is the plan ready",
  "plan-review", "pressure-test the plan". Orchestrates two parallel reviewers —
  architecture and experience — consolidates their findings into one fix gate, and
  applies user-selected fixes to the plan. Always run before non-trivial
  implementation -- a plan that survives review costs less to implement than one
  that doesn't.
---

# Plan Review

## Overview

The plan-review orchestrator. Dispatches `plan-review-architecture` and
`plan-review-experience` in parallel, collects scored findings from each (0-10
on five sub-dimensions), consolidates them into a single ranked fix list, asks
the user to approve fixes, and applies the approved ones to the plan file. The
skill exists because plans fail in two distinct directions — architectural
soundness (data flow, failure modes, edge cases) and human factors (UX hierarchy,
DX touchpoints, error states) — and a single reviewer rarely covers both well.
Splitting the review into two specialist passes catches more, faster. Used
between `write-plan` and implementation.

## When to Use

- A plan exists at `docs/claudekit/plans/<basename>-plan.md` (or equivalent) and
  implementation hasn't started
- A plan has been substantially edited and you want a re-review before merge
- Implementation has started and reviewers have flagged structural issues — back
  up to plan-review before continuing

## When NOT to Use

- The plan is for a single-file, single-author change (use code review instead)
- A previous plan-review already passed and the plan hasn't changed since
- You don't have a written plan yet (use `write-plan` first)

## Process

### Step 1: Locate and read the plan

**Goal:** Confirm the plan file exists and meets the minimum bar to be reviewed.

**Inputs:** A path or filename for the plan.

**Actions:**

1. Find the plan file. Default location: `docs/claudekit/plans/`.
2. Read it end to end.
3. Check minimum bar: numbered task list, file paths cited, test commands named,
   `Acceptance:` lines present, `## Risks` section present.
4. If the plan fails the minimum bar, return to `write-plan`. Do not run review
   on an underdeveloped plan — the reviewers will flag the same things in two
   different voices and waste cycles.

**Output:** Confirmation that the plan is review-ready, or a list of return-to-plan
items.

### Step 2: Dispatch the two reviewers in parallel

**Goal:** Get two independent reviews, each scored on 5 sub-dimensions.

**Inputs:** The plan file.

**Actions:**

1. Dispatch `claudekit:architect` agent with the plan file. Sub-dimensions to
   score: data flow, failure modes, edge cases, test matrix, rollback safety.
2. Dispatch `claudekit:experience-reviewer` agent with the plan file.
   Sub-dimensions to score: information hierarchy, state coverage (loading/empty/
   error), accessibility, DX (error copy, API/CLI ergonomics), AI-slop avoidance.
3. Both run in parallel. Wait for both.
4. Each reviewer returns: a 0-10 score per sub-dimension, a list of findings,
   and a list of suggested fixes ranked by impact.

**Output:** Two reviewer reports.

### Step 3: Consolidate findings

**Goal:** Merge the two reports into one ranked fix list.

**Inputs:** Both reviewer reports.

**Actions:**

1. Combine the findings into a single list. Tag each finding with its source
   (`[arch]` or `[exp]`).
2. De-duplicate. Findings that both reviewers caught get a `[both]` tag and
   higher priority — two independent passes flagging the same thing is signal.
3. Rank by impact-on-implementation:
   - **Blocker** — the plan cannot be executed without this fix
   - **Important** — the plan can execute but will produce a regrettable result
   - **Nice-to-have** — improves clarity but isn't load-bearing
4. Write a consolidated review artifact at
   `docs/claudekit/reviews/<plan-basename>-review-<YYYY-MM-DD>.md` with sections:
   `## Architecture` (with sub-dim scores), `## Experience` (with sub-dim scores),
   `## Consolidated Fixes` (the ranked list).

**Output:** A single review artifact with a ranked fix list.

### Step 4: User decision gate

**Goal:** Get the user's call on which fixes to apply.

**Inputs:** The consolidated fix list.

**Actions:**

1. Present the consolidated list to the user via AskUserQuestion. For each
   blocker, the option is `Apply` or `Acknowledge and skip with rationale`.
   For important and nice-to-have, the option is `Apply` or `Skip`.
2. Skipped blockers must be paired with a one-line rationale that goes into
   the review artifact. Skipped important/nice-to-have items don't need
   rationale but get logged.
3. The user's choices form the apply-list.

**Output:** A list of fixes to apply, with skip rationales for any skipped
blockers.

### Step 5: Apply fixes to the plan

**Goal:** Edit the plan file to reflect the approved fixes.

**Inputs:** The apply-list.

**Actions:**

1. For each fix, edit the plan file. Use the Edit tool, not by rewriting the
   plan from scratch.
2. After each edit, append to the review artifact: `Applied: <fix description>
   → <plan section affected>`.
3. After all fixes are applied, re-read the plan and confirm it's still
   internally consistent. Plans can drift during fix application; re-read catches
   that.
4. Bump the plan's version stamp at the top: `Reviewed and updated YYYY-MM-DD
   via /claudekit:plan-review`.

**Output:** Updated plan file plus updated review artifact. Plan ready to execute.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "Plan-review is overhead — let's just start coding." | Some plans really are simple. Adding ceremony for trivial work is bad. | "Just start coding" is fine for one-file changes; plan-review exists for the cases that aren't. The cost of a 20-minute review against a 4-day implementation is the cheapest insurance you'll buy that week. The cases that *feel* trivial enough to skip review are also the cases where the buried gotcha hits hardest in the third PR. | If your plan has more than 5 tasks or touches more than one module, run plan-review. The 20 minutes saves a round trip later. |
| "I only need one reviewer — architect is enough." | Architectural review is the one most engineers think of when they think "review." | One reviewer covers half the failure modes. The architecture reviewer won't notice that your error copy says "Internal error" instead of telling the user what to do; the experience reviewer won't notice that your DB migration has no rollback. Two independent passes catch ~2x the issues. | Run both reviewers. They're parallel; the wall-clock cost is the slower of the two, not the sum. |
| "I'll skip the blockers I disagree with — they don't apply here." | Sometimes reviewers really are wrong, and an author's domain knowledge can override review. | Skipping a blocker silently is how plan reviews become advisory. The discipline is: skip is fine, but the rationale gets written down in the review artifact. If you can't write a one-line rationale, you don't disagree, you're rationalizing. | Apply Step 4's rule: every skipped blocker gets a one-line rationale. The rationale is the receipt for your choice. Reviewers reading the plan downstream will see the skip and the reason, not just the absence. |
| "I'll fix the plan in my head and not bother editing the file." | Mental updates feel faster than file edits. | The plan you implement against is the plan in the file, not the one in your head. The mental version drifts during the days between review and implementation. The teammate who picks up a task sees the unfixed version and implements the unfixed plan. | Edit the file. Use the Edit tool, not "I'll rewrite it cleanly." Each change is small; the cumulative edit takes minutes. |
| "I'll re-read the plan after applying fixes — but I'm sure it's consistent." | After 5 surgical edits, "I'm sure it's still consistent" is a comfortable belief. | Surgical edits drift. A fix that retitles task 4 may leave a `Blocked by: Task 4` reference dangling somewhere. A fix that splits a task into two may leave the numbering inconsistent. The drift is invisible to the author but obvious on a fresh read. | After Step 5's edits are applied, re-read the plan top to bottom. Catch the dangling references before the implementer does. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | Confirmation note or list of return-to-plan items | "Plan looks fine to me." |
| End of Step 2 | Two reviewer reports, each with 0-10 scores per sub-dim | "Reviewers said it's mostly OK." |
| End of Step 3 | Review artifact at `docs/claudekit/reviews/<plan>-<date>.md` with consolidated ranked fixes | "I'll keep the findings in my head." |
| End of Step 4 | A list of `Apply` / `Skip` decisions; skipped blockers each have a rationale | "I picked the ones I felt good about." |
| End of Step 5 | Plan file updated with each approved fix; review artifact appended with `Applied:` lines | "I made the changes; should be good." |

## Red Flags

- Both reviewers score every sub-dimension 9-10. Either the plan is unusually
  good (rare) or the reviewers are pattern-matching (common). Re-dispatch with
  more pressure.
- One reviewer scores everything 9-10 and the other scores everything 4-5. The
  reviewers diverge wildly; read both reports yourself before consolidating.
- More than 10 blockers. The plan needs to be rewritten, not patched.
- A blocker's "fix" is a sentence-level edit. Fixes that small often mean the
  reviewer was nitpicking. Demote to "important" or "nice-to-have."
- The user skips every blocker with rationale. Either the plan was reviewed by
  the wrong reviewers (mismatch in expertise) or the user is skipping discipline.
  Stop and check.

## References

- *Software Engineering at Google*, Wright et al. (O'Reilly, 2020), Chapter 9
  "Code Review" — the case that review is most effective when reviewers cover
  distinct dimensions, not duplicated coverage. The two-reviewer split (architecture
  vs experience) operationalizes that principle for plan review.
