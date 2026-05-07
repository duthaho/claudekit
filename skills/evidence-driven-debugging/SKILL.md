---
name: evidence-driven-debugging
user-invocable: true
description: >
  Use during active debugging when you have a hypothesis to test or need to
  instrument a running system. Activate for keywords like "debug", "instrument",
  "log", "trace", "breakpoint", "what's happening at runtime", "production
  behavior". Pair to investigate-root-cause for the doing-it phase. Always
  record what you observed -- never debug entirely "in your head" without leaving
  evidence behind.
---

# Evidence-Driven Debugging

## Overview

The active-debugging companion to `investigate-root-cause`. Where investigate
produces a written hypothesis, evidence-driven-debugging is the workflow for
*testing* that hypothesis with real instrumentation: logs, breakpoints, prints,
debugger sessions, runtime probes. The skill exists because the most common
debugging-phase failure is the engineer who runs through three or four mental
hypotheses without writing anything down, ends up where they started, and can't
reconstruct what they tried. Evidence-driven debugging keeps a paper trail.
Used inside Phase 3 of `investigate-root-cause`, but invocable directly when an
existing hypothesis just needs runtime testing.

## When to Use

- You have a hypothesis from `investigate-root-cause` and need to test it
- You're debugging in a system that's hard to step through (async, distributed,
  multi-process)
- You've added logs/prints to test a theory and need to organize what you learn
- A bug only reproduces in a deployed environment, not locally
- You're about to do "let me just add some console.logs" — pause and use this
  skill to keep them organized

## When NOT to Use

- You don't have a hypothesis yet — go to `investigate-root-cause` Phase 2 first
- The bug is in code you can step through with a debugger and the path is short
- The fix is one line and obvious from reading; debugging instrumentation is
  overkill

## Process

### Step 1: State the hypothesis to test

**Goal:** Be explicit about what runtime evidence will confirm or refute.

**Inputs:** A hypothesis (from `investigate-root-cause` Phase 2 or your own
prior thinking).

**Actions:**

1. Write the hypothesis as one sentence: `The bug occurs because [X] causes [Y]
   when [Z].`
2. Decide what runtime evidence would confirm it: a value at a specific line, a
   sequence of events, an absence of an expected log line.
3. Decide what would refute it: the value isn't what you predicted, the
   sequence is different, the expected event happens but the bug still occurs.

**Output:** A test design: `If I see <evidence>, hypothesis is confirmed; if I
see <other>, hypothesis is refuted; ambiguous = collect more.`

### Step 2: Place instrumentation

**Goal:** Add the minimum runtime probes to capture the evidence.

**Inputs:** The test design.

**Actions:**

1. Choose the instrumentation method that fits the system:
   - Synchronous code with a debugger available: breakpoint at the predicted line.
   - Async or distributed code: structured log lines with a tag (e.g.,
     `[bug-1234]`).
   - Production-only repro: a feature flag that turns on extra logging for one
     tenant or one user.
2. Add probes at the boundaries: input, decision points, output. Three probes
   beats one super-probe — boundaries catch where the value changes.
3. Tag every probe with the same identifier so you can filter logs later.
4. Commit the instrumentation in a separate commit with a `debug:` prefix so
   it's easy to revert.

**Output:** Instrumentation in code (or in a debugger config), tagged.

### Step 3: Reproduce and capture

**Goal:** Run the bug with the instrumentation in place and capture output.

**Inputs:** Instrumented code + the reproducer from `investigate-root-cause`
Phase 1.

**Actions:**

1. Run the reproducer. Capture every probe's output.
2. Save the captured output to a scratch file or PR comment. Don't rely on
   terminal scrollback.
3. If the bug is intermittent, run the reproducer multiple times. Capture each
   run separately so you can spot the variance.

**Output:** Captured probe output, saved.

### Step 4: Compare against the test design

**Goal:** Decide confirm/refute/ambiguous.

**Inputs:** Captured output + Step 1's test design.

**Actions:**

1. Read the output line by line. Match each line to the design's expected
   evidence.
2. Verdict:
   - **Confirmed:** the predicted evidence matched. Move to fix.
   - **Refuted:** the prediction was wrong. The hypothesis is wrong; return to
     `investigate-root-cause` Phase 2 with the new evidence.
   - **Ambiguous:** the output didn't clearly match either case. Add more
     instrumentation (Step 2 again) or run more reproducers (Step 3 again).
3. Write down the verdict and the evidence supporting it.

**Output:** A one-line verdict: `Hypothesis confirmed | Refuted (return to
hypothesis) | Ambiguous (add probes at <location>)`.

### Step 5: Clean up the instrumentation

**Goal:** Remove debug probes when the work is done.

**Inputs:** A confirmed hypothesis (or a refuted one that led you elsewhere).

**Actions:**

1. Revert the `debug:` commits, OR
2. Convert any probes worth keeping into proper structured logs (with the
   project's standard logger, with the right log level, no `[bug-1234]` tag).
   These become permanent observability.
3. Confirm no debug `print` / `console.log` / `dbg!` lines remain in the
   committed code.

**Output:** Clean working tree. Either the debug commits are reverted or
formalized.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "I'll just add some console.logs and figure it out as I go." | Fast, low-overhead, the standard move. | The "figure it out as you go" version usually doesn't write down the hypothesis you're testing or what would refute it. You add prints, see some output, decide it "looks suspicious," add more prints, follow the suspicion, and lose track of which hypothesis you started with. By the time you find the bug (or get stuck), you can't reconstruct what you tried. | Spend 60 seconds on Step 1's test design before adding probes. Even one sentence is enough. The structure forces you to know what you're looking for, which is what makes the probes interpretable when they fire. |
| "The probes don't need tags — there aren't that many logs." | A handful of probes in a quiet system don't need filtering. | "Not that many logs" is true on your dev box. In a production-grade reproducer, the probe lines are intermixed with framework logs, request logs, third-party noise. Untagged probes are findable only by remembering which file you put them in, which is the same memory problem the skill exists to fix. | Tag every probe with the same identifier (`[bug-1234]`, `[debug-jane]`, whatever's unique). Filtering on the tag isolates your evidence in seconds. |
| "I don't need to save the output — I just looked at it." | Looked-at-and-understood is real. | Looked-at-and-understood doesn't survive a context switch. If you finish a debugging session at 6 PM and resume at 9 AM, the captured output is gone, you're reconstructing from the bug-fix patch you didn't write down, and you re-instrument in a slightly different way and lose comparability. | Save the output. Even if it's `tail -f log.out > /tmp/bug-1234-run-1.log`. The save is the deliverable for Step 3. |
| "Refuted hypothesis means I should fix it anyway — I have a workaround in mind." | Sometimes the workaround is faster than continuing to investigate. | The workaround that ships against a refuted hypothesis is the workaround that doesn't fix the actual bug. The bug recurs in a different shape because the fix addressed a hypothesis the evidence already disagreed with. The workaround is at best a shim and at worst a compounding error. | If refuted, return to `investigate-root-cause` Phase 2. The evidence you just gathered is input to the next hypothesis; don't waste it by patching against a hypothesis it disproved. |
| "I'll leave the debug logs in — observability is good." | Adding logs is one of the cheapest improvements to a service's observability. | Debug logs left in are not observability. They lack the structure (level, key-value, sampling) of proper logs; they pollute the log stream with bug-1234 tags forever; they confuse the next person who searches for "the right way" to log this thing and finds your debug prints. | If a probe is genuinely useful as long-term observability, *convert* it: re-write as a structured log with proper level, no tag, in the right place. Otherwise revert. The middle option (leave the debug logs in unchanged) is the worst of both. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | A test design naming what confirms, refutes, and what's ambiguous | "I'll see what the logs say." |
| End of Step 2 | Instrumented code committed with `debug:` prefix and a shared tag | "I dropped some console.logs in." |
| End of Step 3 | Captured output saved to a file or PR comment | "I saw the output in my terminal." |
| End of Step 4 | A one-line verdict and the evidence supporting it | "It seems like the cache is the problem." |
| End of Step 5 | Reverted or formalized probes; clean working tree confirmed | "I'll clean up the debug logs later." |

## Red Flags

- More than 5 probes added in one round. You're guessing where to look; tighten
  the hypothesis first.
- Probes are clustered in one file even though the system is multi-component.
  You're debugging only the part you're comfortable with, not the system.
- The output file is empty after Step 3. Either the reproducer didn't actually
  run or the probe is on a code path that wasn't hit. Check before you draw
  conclusions.
- The verdict is "ambiguous" three times in a row. Either the hypothesis is too
  vague (return to Phase 2) or the system is genuinely too hard to instrument
  through (escalate to someone who knows the runtime).
- The cleanup step is "I'll do it after the PR merges." Debug commits live in
  the merged history forever; clean up before merge.

## References

- John Allspaw, "Resilience Engineering: Where Do I Start?"
  (adaptivecapacitylabs.com, 2019) — the principle that observability is
  designed before the incident, not retrofitted during. Step 5's "convert vs
  revert" decision operationalizes this for per-bug debugging instrumentation.
