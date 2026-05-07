---
name: code-review-loop
user-invocable: true
description: >
  Use when opening a PR for review or when receiving review feedback. Activate
  for keywords like "code review", "PR review", "request review", "review
  feedback", "address comments", "reviewer said". Covers both ends of the loop:
  preparing a reviewable PR and acting on feedback rigorously. Always engage with
  every comment -- never dismiss feedback by silently ignoring it.
---

# Code Review Loop

## Overview

End-to-end code review etiquette. Covers the requesting side (preparing a PR
that's reviewable) and the receiving side (acting on feedback). The skill exists
because most code review failures aren't disagreement — they're noise. Reviewers
get PRs they can't reasonably review (1500 lines, mixed concerns, no
description) and authors get feedback they don't engage with seriously
(silent dismissals, "fixed" without explanation, defensive replies). The skill
enforces structure on both ends and dispatches `claudekit:code-reviewer` /
`claudekit:security-auditor` agents on the diff. Used after `verification-gate`,
before merge.

## When to Use

- Opening a PR for review
- Responding to review comments on a PR you authored
- Reviewing a PR another engineer authored (the skill applies symmetrically)
- Re-requesting review after addressing feedback

## When NOT to Use

- Quick fixes via direct push to a branch nobody else uses (no review needed)
- A PR is already merged and you have post-merge feedback (file a follow-up
  issue, don't re-litigate)
- Reviewing infra/config that the project's policy explicitly auto-approves

## Process

### Step 1: Prepare the PR (requesting side)

**Goal:** A reviewable PR.

**Inputs:** A branch with verified changes (you've run `verification-gate`).

**Actions:**

1. The PR title is one line, describing what changed. Not "Updates" or "Fix
   stuff." Verb-led: "Add idempotency key to charge endpoint."
2. The PR description has these sections:
   - **What:** 1-3 sentences naming the change.
   - **Why:** the spec link, the ticket, the bug being fixed.
   - **How:** the design choice, especially if non-obvious. Cite the plan if
     one exists.
   - **Verification:** the output from `verification-gate` (paste or link).
   - **Risk + rollback:** if the change has any risk, name it and the rollback
     procedure.
3. Check the diff size. If >400 lines (excluding tests, generated files,
   lockfiles), consider splitting the PR. Reviewers won't read the whole thing
   carefully; they'll skim, miss issues, and approve.
4. Tag the right reviewers. For sensitive paths (auth, payments, data), tag
   the security-savvy reviewer too.

**Output:** A PR open for review with the description filled out.

### Step 2: Dispatch the reviewer agents

**Goal:** A first pass before human reviewers spend their time.

**Inputs:** The open PR.

**Actions:**

1. Dispatch `claudekit:code-reviewer` on the diff. Returns: structural findings
   (data flow, error handling, edge cases), style findings, complexity findings.
2. If the diff touches `auth/`, `payments/`, `crypto/`, `users/`, `sessions/`,
   `tokens/`, or any path with sensitive-data semantics, also dispatch
   `claudekit:security-auditor`. Returns: input-validation findings, OWASP-aligned
   findings, secret-handling findings.
3. Read both findings lists. Address obvious issues (typos, missing error
   handling, easily-fixed structural notes) yourself before human reviewers see
   the PR.
4. Push the changes. Note in the PR description that automated reviewer agents
   ran, plus any findings you intentionally deferred.

**Output:** A PR that has been pre-reviewed by agents; obvious findings already
addressed.

### Step 3: Receive feedback (receiving side)

**Goal:** Engage with every comment.

**Inputs:** Reviewer comments on the PR.

**Actions:**

1. Read every comment before responding to any. Get the full picture; don't
   start replying piecemeal.
2. For each comment, choose one of three responses:
   - **Agree + apply:** make the change. Reply with the commit hash that
     applied it. Don't reply "fixed" without the hash.
   - **Disagree + explain:** explain why you disagree. Cite evidence (a test, a
     constraint, a decision in the spec). Ask the reviewer if your reasoning
     resolves their concern.
   - **Need more context:** ask the reviewer for clarification. Don't guess at
     what they meant.
3. Never silently dismiss a comment. If you didn't apply it and didn't reply,
   the reviewer assumes you missed it.

**Output:** Every comment has a response thread.

### Step 4: Apply changes in coherent commits

**Goal:** Make the diff history easy to re-review.

**Inputs:** The agreed changes from Step 3.

**Actions:**

1. Group changes by topic. One commit per topic, even if multiple comments
   contributed to it.
2. Each commit message names what changed and references the comment thread
   ("Address review: extract validation to <module>; thread #N").
3. Don't squash before re-review unless the project's policy demands it.
   Reviewers want to see what changed since their last pass.

**Output:** New commits on the branch addressing the agreed feedback.

### Step 5: Re-request review

**Goal:** Hand back to the reviewer with a clear next step.

**Inputs:** The branch with applied changes.

**Actions:**

1. Add a single comment on the PR summarizing what you addressed and what you
   pushed back on:
   - "Addressed: comments #1, #3, #5 (commits a1b2c, c3d4e)"
   - "Pushed back: comments #2, #4 — see threads"
2. Re-request review through the platform's mechanism (re-assign, request
   re-review, etc.).
3. Don't ping by Slack/IM unless the PR is blocking and reviewers are unaware.

**Output:** Reviewers re-engaged with a summary of what changed.

### Step 6: Close the loop

**Goal:** Merge cleanly.

**Inputs:** Approval from required reviewers.

**Actions:**

1. Confirm CI is green at the most recent commit (not the branch tip from when
   review was requested).
2. Resolve all comment threads. If a thread has unresolved disagreement, the PR
   shouldn't merge yet — escalate or compromise.
3. Merge using the project's standard method (squash, merge commit, rebase).
4. If the PR introduced anything not yet rolled out (feature flag off, config
   not flipped), the PR is *merged* but not *delivered* — track delivery
   separately.

**Output:** PR merged. Any pending delivery steps tracked.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "I'll write a quick PR description and the reviewer can read the diff for context." | The diff is the source of truth; the description is metadata. | The diff shows *what* changed, not *why*. A reviewer reading the diff cold has to reconstruct the intent, the constraints, the alternatives considered. They will reconstruct partially, miss something, ask questions you've already answered in the spec, and slow the review by hours. | Write the description. The What/Why/How structure is short — 4-8 sentences — and saves the reviewer reconstruction time. The PR description is a contract: this is what I'm asking you to look for. |
| "The PR is large but the changes are mechanical — easy to review." | Mechanical changes are real. A rename across 800 lines is genuinely simple. | "Mechanical" is the line said before someone discovers a non-mechanical change buried in the mass: a slightly different signature, an off-by-one, a behavior tweak the rename quietly altered. Reviewers don't read 800-line "mechanical" PRs line-by-line; they spot-check and approve. The buried bug ships. | Split the PR. Mechanical-only commit goes first, behavior changes (if any) go in a separate small PR after. If the PR is genuinely 100% mechanical, you can call that out explicitly and the reviewer can approve confidently — but don't ask them to take "mechanical" on faith. |
| "I'll reply 'fixed' to the comments — the reviewer can see the new commits." | The reviewer can navigate the PR; making them re-derive the linkage feels like courtesy theater. | The reviewer is reviewing many PRs that day; they don't remember which comment maps to which commit, and the PR UI doesn't always make it obvious. "Fixed" without a hash forces them to scan the diff hunting for your change, find it, verify it, and *then* react. The hash saves the search. | Reply with the commit hash: "Fixed in a1b2c3d." Or, if it was multi-commit: "Fixed in a1b2c3d (extracted) and c3d4e5f (renamed param)." 10 seconds for you, 90 seconds saved per comment for the reviewer. |
| "The reviewer's comment is wrong — I'll just leave it and merge." | Sometimes reviewers really are wrong. Defending against bad feedback is a real skill. | Silently dismissing the comment doesn't tell the reviewer they're wrong; it tells them they were ignored. Next PR, they'll either escalate the same comment more aggressively or stop reviewing your PRs carefully. The disagreement is the data; suppressing it loses the data and the relationship. | If you disagree, reply with your reasoning. Cite evidence. Ask if your reasoning resolves their concern. They may have context you don't, or vice versa — the comment thread is where that gets surfaced. |
| "Security review is overkill for this — the file is just a refactor." | Refactors really don't usually change security posture. | "Just a refactor" can move a sensitive call across a boundary, change which path a request takes, alter the ordering of validation and side effects. The security-auditor agent is automated and cheap; running it on a refactor that touches sensitive paths takes 30 seconds and catches the cases where "just a refactor" wasn't. | If the diff touches any sensitive path (auth, payments, crypto, users, sessions, tokens), dispatch the security-auditor regardless of how mechanical the change feels. The cost is automated; the risk is asymmetric. |
| "CI ran when I opened the PR — that's still the source of truth." | CI results don't usually change between open and merge. | The branch typically has new commits between PR-open and merge (review feedback, conflict resolution, the dependency upgrade that sneaked into main). The CI run from PR-open is testing a state that no longer exists. Merging on stale green is how flaky-vs-broken slips through. | Confirm CI is green on the *current* commit before merging. Most platforms show this; if yours doesn't, push a no-op or re-run CI to confirm. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | PR description with What/Why/How/Verification/Risk sections; diff <400 lines (or split rationale) | An empty PR description; "see ticket." |
| End of Step 2 | Reviewer agent findings addressed or noted as deferred | "I think the code is fine; let humans look." |
| End of Step 3 | Every comment has a response | Some comments left unanswered. |
| End of Step 4 | New commits each named with topic + comment-thread reference | One huge "address review" commit. |
| End of Step 5 | A summary comment listing what was addressed and what was pushed back on | Re-request without summary. |
| End of Step 6 | CI green on the most recent commit; all threads resolved | "Merged it; CI was green earlier." |

## Red Flags

- The PR description is one sentence. The reviewer is reconstructing your work
  from the diff alone.
- The diff exceeds 400 non-trivial lines and isn't split. Reviewers will skim.
- A comment thread has more than 5 back-and-forth replies. The disagreement
  needs to be moved to a synchronous conversation.
- Multiple comments left without any reply from the author. The PR was abandoned
  mid-review.
- The PR was merged with unresolved comment threads. The disagreement is now
  hidden in the history.
- The PR has 20 commits each titled "fix review." Squash before merge or commit
  with topical messages.
- The "Verification" section is missing. The PR jumped from work to merge
  without the gate.

## References

- *Software Engineering at Google*, Wright et al. (O'Reilly, 2020), Chapter 9
  "Code Review" — "Small CL" principle and the case that review effectiveness
  inversely correlates with diff size. Step 1's 400-line guideline derives
  from Google's internal observations on review-found-defects vs CL size.
