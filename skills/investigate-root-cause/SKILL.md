---
name: investigate-root-cause
user-invocable: true
description: >
  Use when encountering ANY bug, error, test failure, or unexpected behavior. Activate
  for keywords like "bug", "error", "failing", "broken", "doesn't work", "unexpected",
  "crash", "exception", "TypeError", "undefined", stack traces, or any error message.
  Also trigger when tests fail unexpectedly, when behavior differs from expectations,
  when investigating production incidents, or when flaky/intermittent issues appear.
  Investigation produces evidence and a written hypothesis before any fix is attempted.
  Always investigate root cause before proposing fixes -- never guess at solutions.
---

# Investigate Root Cause

## Overview

A four-phase debugging workflow that forces an engineer to gather evidence and write
down a hypothesis *before* changing any code. The skill exists because the most
common debugging failure isn't a missing technique — it's the engineer skipping past
the error message, forming a vague mental theory, and patching the symptom. Every
phase here produces an artifact you could paste into a code review. If you can't
produce the artifact, you haven't done the phase. The skill is for senior ICs and
tech leads who already know how to debug; what it adds is the discipline to refuse
to fix what you don't yet understand.

## When to Use

- A test is failing and you don't already know why
- An error message appeared that you cannot immediately point to a line of code for
- A reproduction is intermittent (sometimes passes, sometimes fails)
- A previously passing system started failing after no obvious cause
- Production is misbehaving and the cause isn't in the most recent commit
- You catch yourself about to write a fix while still uncertain why the bug happens

## When NOT to Use

- The error message names a missing import, typo, or syntax error and the fix is one
  character. Just fix it.
- The runbook for this exact failure exists and the documented fix has been applied
  before. Follow the runbook.
- The "bug" is a config value that needs flipping in an environment variable. Flip it.

## Process

Four phases. Each phase has a gate. You do not advance until the gate's evidence
artifact exists.

### Phase 1: Gather

**Goal:** Surface every fact that already exists about this bug, before forming any
theory.

**Inputs:** A bug report, a failing test, an error message, or a complaint
("it doesn't work").

**Actions:**

1. **Capture the literal error.** Copy the full text of the error message and the
   complete stack trace. Do not paraphrase. If there is no error message, write down
   the exact observed-vs-expected behavior in one sentence each.
2. **Find the reproduction.** Run the failing scenario yourself. Record the exact
   command, environment, and inputs. If you cannot reproduce it, that is the bug to
   investigate first — go to Step 3 and Step 4 and stay in Phase 1 until you can.
3. **Read recent history.** Run `git log --oneline -30` and read the last 30 commits.
   Note which commits touch files in the stack trace.
4. **Collect logs.** Pull logs around the failure window. If structured logs exist,
   filter to the request or session that hit the bug. If not, raise the verbosity
   and re-run the reproduction.
5. **Look at the data.** If the bug involves a record, fetch the record. If it
   involves a query, run the query. If it involves a request body, capture the body.

**Output:** A short text block titled `Phase 1: Gather` containing the literal error
text, the exact reproducer command, the relevant commit hashes, log excerpts, and
data values. Pasted into a scratch file or PR description.

### Phase 2: Hypothesize

**Goal:** Convert evidence into a single specific written hypothesis. One.

**Inputs:** The Phase 1 artifact.

**Actions:**

1. **Find a working comparison.** Locate the closest equivalent code path that
   succeeds. Read it. Note the differences.
2. **Identify the smallest difference that matters.** Configuration, data shape,
   environment, timing, or contract. Name it.
3. **Write the hypothesis as one sentence in this exact form:**
   `The bug occurs because [X] causes [Y] when [Z].`
   No "I think." No "maybe." If you can't fill all three slots, return to Phase 1.

**Output:** A one-sentence hypothesis added under `Phase 2: Hypothesize`. Plus the
file:line citation of the working comparison code.

### Phase 3: Test

**Goal:** Prove or disprove the hypothesis with a single deliberate change.

**Inputs:** The hypothesis from Phase 2.

**Actions:**

1. **Design the smallest test of the hypothesis.** Often this is a one-line
   `print` / `console.error` / breakpoint at the line where you predicted the
   anomaly happens, NOT a fix.
2. **Run it. Capture the output.** Record what you saw with the same rigor as
   Phase 1's literal error capture.
3. **Decide:** does the output confirm or refute the hypothesis?
   - **Confirm:** advance to Phase 4.
   - **Refute:** return to Phase 2 with the new evidence. Update the hypothesis.
     Do not start patching.

**Output:** Under `Phase 3: Test`, the exact instrumentation used, the output
captured, and a one-line verdict: `Hypothesis confirmed | Hypothesis refuted →
return to Phase 2`.

### Phase 4: Prove

**Goal:** A fix that addresses the cause, with a regression test that pins it.

**Inputs:** A confirmed hypothesis.

**Actions:**

1. **Write a failing test that captures the bug.** The test fails on `main` and
   passes after the fix. It exercises the cause, not the symptom.
2. **Make the smallest change that makes the test pass.** Single targeted fix at
   the cause. Do not bundle other improvements.
3. **Run the failing test. Confirm it passes.**
4. **Run the full test suite. Confirm green.**
5. **Run the original reproduction from Phase 1. Confirm fixed.**

**Output:** Under `Phase 4: Prove`, paste:
- Failing test name and location
- Test runner output before fix (red)
- Test runner output after fix (green)
- Full-suite output (green)
- Original Phase 1 reproducer output (now passing)

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "I think I see the problem — let me just patch it." | The fix often is small once you understand it. The instinct that you "see it" feels like signal. | If you were right, you wouldn't need a hypothesis. The "I see it" feeling is pattern-matching on similar bugs you've seen before, and pattern-matching has a high false-positive rate on real systems. The patches that ship from this state usually fix the *symptom* one observation downstream of the cause. | Phase 2 anyway. Write the hypothesis sentence. If it really is obvious, this takes 60 seconds. If you can't write the sentence, you didn't actually see it. |
| "Can't reproduce locally — must be a flake." | Flakes do exist, and chasing a non-reproducer wastes time. | "Flake" is what we call a bug whose trigger condition we haven't found yet. Closing a ticket as "flaky" hands the bug to the next person who hits it, plus accumulated mystery. The trigger is real; you just don't know it yet. | Treat "can't reproduce" as the bug. Phase 1, Step 2: list every difference between your environment and the failing one (timezone, locale, clock skew, parallelism, container vs host, data size, prior test state). Bisect on differences. |
| "It worked before the last deploy — it's the deploy." | Recent deploys do cause regressions, and `git bisect` is real evidence. | "It's the deploy" without bisect is folklore. The deploy may have shifted timing, exposed a latent bug, or changed something orthogonal. Skipping bisect means the fix may also be folklore. | Run `git bisect` between the last known good and the first known bad. Cite the actual offending commit hash in the hypothesis. |
| "It's probably a race condition." / "Must be caching." | These categories explain a lot of intermittent bugs. | Naming a category is not a hypothesis. "Race condition" doesn't tell you which two operations race or what the interleaving is. Until you can write `[X] causes [Y] when [Z]` with the actual operations and ordering, you're labeling, not investigating. | Phase 2 with concrete operations: which thread/request reads, which writes, what happens when the write lands during the read. Same shape for caching: which key, which TTL, what stale value, who serves it. |
| "Let me wrap it in a try/catch and move on." | Defensive coding is a real practice, and silencing exceptions does keep the surface stable. | Catching the exception that resulted from the bug doesn't fix the bug — it hides the evidence the next investigator needs. The system continues to be wrong, just quieter. The next failure will be downstream and harder to trace. | If a try/catch is appropriate for *known* failure modes, fine — but only after the cause is understood. The catch goes in Phase 4 *with* a hypothesis-confirmed reason for tolerating that failure mode. Otherwise you are masking. |
| "I'll add some logs and check it tomorrow." | Adding logging is a real Phase 1 action. | The trap is the "tomorrow" part — logs that get added without a written hypothesis, drift in the codebase as cruft, and never get analyzed because by tomorrow the urgent thing has shifted. The investigation gets put down without a marker. | Add logs, but inside Phase 1 with a written reason: "logging X to test whether Y occurs before Z." Set a calendar reminder for the analysis. If you won't analyze tomorrow, don't add the logs. |
| "The error message is misleading — the real bug is somewhere else." | Sometimes errors do surface far from their cause. | "The error is misleading" said *before* Phase 1's literal capture is the engineer dismissing evidence they haven't read carefully yet. The error message is data; "misleading" is a story you tell about data. Read the data first. | Paste the literal error in Phase 1. If the message names a file:line, look at that file:line before declaring the message is wrong. Most "misleading" errors are accurate; the engineer was holding a wrong mental model of which code runs first. |

## Evidence Requirements

Every phase has a gate. If the gate's artifact does not exist, that phase has not
been completed.

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Phase 1 | Literal error text + reproducer command + relevant commit hashes pasted in a `Phase 1: Gather` block | "I read through the code and I'm pretty sure it's in the auth module." |
| End of Phase 2 | One sentence in form `The bug occurs because [X] causes [Y] when [Z]` | "It's probably a race condition somewhere in the request lifecycle." |
| End of Phase 3 | Captured output from a deliberate test of the hypothesis (instrumentation OR experiment), plus a confirm/refute verdict | "Yeah I tried a thing and it seemed to work." |
| End of Phase 4 | Failing test (red), passing test after fix (green), full suite (green), original reproducer (fixed) — all four pasted | "Tests pass on my machine." |

If you can't paste it, you haven't done it. Stop.

## Red Flags

Concrete observations that mean STOP and reassess.

- You've changed the same line three or more different ways in the last hour. You
  don't have a working hypothesis; you're guessing.
- You added a `try/catch`, `if err == nil`, or test-skip whose justification is
  "to make the test pass." That's masking, not fixing.
- The hypothesis sentence is missing the `when [Z]` clause. You don't know the
  trigger condition. The fix will be partial.
- Three consecutive fix attempts have failed. The bug is architectural, not local.
  Escalate or rescope.
- You're about to ship a fix you cannot explain to the next reviewer in one
  sentence. The reviewer won't accept it; you shouldn't either.
- The failing test you wrote in Phase 4 doesn't actually fail on `main` without
  the fix. It tests something tangential. Rewrite it.

## References

- John Allspaw & Richard Cook, *How Complex Systems Fail* (Cognitive Technologies
  Laboratory, 1998) — point #5 ("Complex systems run in degraded mode") and point
  #14 ("Change introduces new forms of failure"). Use these to resist the "it
  worked before the deploy" reflex; the post-deploy failure is often a latent
  problem made visible, not the deploy itself.
- *Site Reliability Engineering*, Beyer et al. (Google, O'Reilly 2016), Chapter 12
  "Effective Troubleshooting" — defines the diagnose-test-fix loop this skill's
  Phases 2-4 implement, and explicitly warns against the "I know what's wrong"
  pattern handled in the Rationalizations table.
