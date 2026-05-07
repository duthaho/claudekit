---
title: Testing & Debugging
description: How Claude Kit enforces test-first discipline, root-cause investigation, and pre-completion verification.
---

# Testing & Debugging

Three connected workflows: **test-first for building**, **investigate-root-cause for fixing**, and **verification-gate before completion**.

## Test-first

**Triggers on**: "implement", "add feature", "fix bug", "TDD", "write the test first"

`test-first` enforces strict red-green-refactor for all production code changes:

```
1. Pick the smallest testable behavior
2. Write a failing test       → Run it → Confirm it fails (RED) → Paste output
3. Make it pass with the smallest change → Confirm it passes (GREEN) → Paste output
4. Refactor                   → Confirm tests still pass → Paste output
5. Loop with the next case
```

The runner output is the evidence. If you can't paste red and green, you haven't run the cycle.

### Stack-specific commands

| Stack | Test command | Notes |
|-------|-------------|-------|
| Python (pytest) | `pytest <path> -k <name>` | Use `-x` to stop on first failure during red. |
| Node (vitest) | `vitest run <file>` | Pass `--reporter=verbose` for clear output. |
| Node (jest) | `jest <file> -t <name>` | |
| Rust (cargo) | `cargo test <name>` | `--nocapture` to see prints during dev. |
| Go | `go test ./<pkg> -run <name>` | `-v` for verbose. |
| Playwright (E2E) | `npx playwright test <file>` | Reserve for end-to-end golden paths. |

## Investigate root cause

**Triggers on**: "bug", "error", "failing", "broken", "doesn't work", "TypeError", stack traces

`investigate-root-cause` follows four phases. No fixes without a written hypothesis first.

### Phase 1: Gather

Surface every fact that already exists. Capture the literal error text + stack trace (don't paraphrase). Find the reproduction. Read recent commits touching files in the trace. Pull logs around the failure window. Look at the actual data.

### Phase 2: Hypothesize

Convert evidence into one written sentence:

> The bug occurs because [X] causes [Y] when [Z].

No "I think." No "maybe." If you can't fill all three slots, return to Phase 1.

### Phase 3: Test

Design the smallest test of the hypothesis (instrumentation OR experiment). Run. Capture output. Verdict: **Confirmed** → advance to Phase 4. **Refuted** → return to Phase 2 with new evidence. **Ambiguous** → add probes.

For active runtime instrumentation in this phase, `evidence-driven-debugging` is the companion skill — adds tagged probes, captures output, cleans up after.

### Phase 4: Prove

A failing test (red) that captures the bug. The smallest fix that makes it pass (green). Full suite green. Original Phase 1 reproducer post-fix. Paste all four runner outputs.

### The three-fix rule

If three or more fix attempts have failed consecutively, the bug is architectural, not local. Stop. Escalate or rescope.

## Verification gate

**Auto-triggers on**: completion claims ("done", "fixed", "tests pass", "ready to merge")

`verification-gate` is the load-bearing pre-completion check. Six steps:

1. **Restate the claim** — `I am claiming <X> is complete because <Y>` (Y must be evidence).
2. **Run the named tests** with full output. Paste it.
3. **Run the negative path** — invalid input, missing field, network failure, max-size input. Capture what happens.
4. **Verify in a non-IDE environment** — `curl` from a separate shell, fresh container, browser open. The IDE has env vars and hot-reload that production doesn't.
5. **Cross-check the original ask** — re-read the ticket, matrix what was asked to where it was addressed.
6. **Sign the gate** — add a `## Verification` section to the PR with all of the above.

If the runner output isn't pasted, the gate hasn't run.

## What gets caught

```
Without verification:
  "I've fixed the bug" → Actually introduced a new failing test elsewhere
  "Tests pass" → Only ran the file the change was in; suite has 3 failures
  "Works on my machine" → Production env var not set; nothing works in prod

With verification:
  Run named tests → green; run full suite → green;
  curl from fresh shell → expected response;
  cross-check ticket → all asks addressed → sign the gate
```

## Supporting agents

| Agent | Role |
|-------|------|
| `tester` | Design test cases; write tests with red-green discipline; paste runner output |
| `investigator` | Root-cause investigation with evidence chain |
| `security-auditor` | OWASP-aligned review on sensitive paths (when bugs touch auth/payments/crypto) |

## Related pages

- [Planning & Building](/workflows/planning-and-building/) — Spec, plan, plan-review, implement
- [Reviewing & Shipping](/workflows/reviewing-and-shipping/) — Code review and release workflows
- [Skills Reference](/reference/skills/) — All 16 skills
