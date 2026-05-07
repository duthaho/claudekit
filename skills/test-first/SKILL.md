---
name: test-first
user-invocable: true
description: >
  Use when implementing any feature, bugfix, or refactor that has a testable outcome.
  Activate for keywords like "TDD", "test-first", "red-green", "write the test
  first", "implement <feature>", "fix <bug>". Enforces the red-green-refactor
  discipline -- write a failing test, make it pass with the smallest change, refactor
  with tests as a safety net. Always paste the red and green test runner output --
  never claim "tests pass" without showing them pass.
---

# Test First

## Overview

Red-green-refactor TDD with strict evidence requirements. The skill exists because
the most common testing failure isn't missing tests — it's tests written *after*
the code, designed to pass against the implementation rather than to specify it.
Test-first inverts the order: a failing test asserts the desired behavior, the
smallest implementation makes it pass, and refactoring runs with the test as a
safety net. Each step produces test runner output that goes into the PR. The
skill is for engineers shipping production code — not a TDD evangelism doc.

## When to Use

- Implementing a new feature with a testable surface (function, endpoint, CLI
  command, UI behavior with a test harness)
- Fixing a bug — the regression test is the test you write first
- Refactoring code that has incomplete test coverage; tests come before the
  refactor
- Onboarding to legacy code where you need to characterize behavior before
  changing it

## When NOT to Use

- Pure UX/visual work with no behavioral assertion (use visual review instead)
- Exploratory spike work where the goal is learning, not shipping (mark spike
  branches and write tests when promoting to mainline)
- Writing a one-off script that runs once and is discarded

## Process

### Step 1: Pick the smallest testable behavior

**Goal:** Identify one observable behavior to assert, smaller than the task.

**Inputs:** A task from your plan with an `Acceptance:` line.

**Actions:**

1. Read the acceptance criterion. Extract one specific input/output pair you
   could write as a test.
2. If the criterion is too broad ("handles user signup correctly"), narrow it
   to one case: "user signup with a duplicate email returns 409."
3. Name the test in a sentence form: `it <verb>s <subject> when <condition>`.

**Output:** A test name and a one-line description of the input/output pair.

### Step 2: Write the failing test (RED)

**Goal:** A test that currently fails for the right reason.

**Inputs:** The test name from Step 1.

**Actions:**

1. Open the test file. Create one if it doesn't exist; place it next to the
   code-under-test or in the project's standard test location.
2. Write the test. Arrange-Act-Assert structure. No setup beyond what this
   specific case needs.
3. Run the test. Confirm it fails.
4. **Read the failure message.** It must fail because the behavior is missing,
   not because of a typo, missing import, or wrong file path. If it fails for
   the wrong reason, fix the test before continuing.
5. Paste the red output into your scratch space or PR description. This is your
   Step 2 evidence.

**Output:** Test code committed in a `test:` commit (or staged), red runner
output captured.

### Step 3: Make it pass with the smallest change (GREEN)

**Goal:** The test passes after a minimal implementation.

**Inputs:** The failing test.

**Actions:**

1. Implement the simplest code that could make the test pass. Hardcoded values
   are acceptable here if no second test exists yet.
2. Run the test. Confirm it passes.
3. Run the full suite (or at least the file's test group). Confirm no regressions.
4. Paste the green output and the suite output. This is your Step 3 evidence.

**Output:** Implementation committed (or staged) in a separate commit from the
test. Green runner output captured.

### Step 4: Refactor (REFACTOR)

**Goal:** Improve the code's structure with the test as a safety net.

**Inputs:** Passing test and implementation.

**Actions:**

1. Look at the implementation. Identify duplication, unclear names, awkward
   structure.
2. Make one structural improvement at a time. Run the test after each.
3. If the test fails after a refactor, the refactor changed behavior — back it
   out, don't push through.
4. Stop refactoring when the cost of further changes exceeds the benefit. This
   step is finite; don't gold-plate.
5. Paste the post-refactor green output. This is your Step 4 evidence.

**Output:** Refactored implementation, all tests still green.

### Step 5: Add the next test

**Goal:** Cycle back to Step 1 with a new case.

**Inputs:** Acceptance criteria not yet covered.

**Actions:**

1. Pick the next-smallest behavior from the acceptance criterion.
2. Loop Steps 1-4.
3. Continue until all acceptance criteria are covered.

**Output:** A complete test suite for the task, with red→green evidence for each
step.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "I'll write the tests after the implementation — same outcome." | The tests do exist either way; order seems like ceremony. | Tests written after implementation are designed against the code that exists, not against the behavior the code should have. They confirm what was built; they don't catch what should have been. The "same outcome" claim only holds if you'd write the same tests both ways, and the literature (and most engineers' experience) shows you don't. | Write the test first. Take the 5 minutes to capture the failing output. The discipline cost is low and the test you write is meaningfully different. |
| "This is too simple to test — it's just a getter." | Trivial code is genuinely common, and writing tests for it does feel like make-work. | "Too simple" is the line said before someone changes the getter to compute something derived, and the absence of a test means the change ships without a check. The test is documentation: when the next person modifies the function, they see what callers expect. | If the code has any behavior — even returning a stored value with a computed default — write the test. Three lines of test code are not the cost they feel like. If it's truly inert (a constant), skip the test and don't lose sleep. |
| "Tests slow me down — I'll add them at the end." | Writing tests during a feature does add minutes to the cycle. | "At the end" usually means after the PR is open, after the reviewer is waiting, after the feature is "done in your head." At that point tests get written under time pressure, against the implementation that exists, with the corners-cut they always have under that condition. The minutes saved by deferring are paid back at 3-5x in the PR cycle. | Write the test first. Each red→green cycle is 10-15 minutes. By the end of the task, the tests are real and the PR is short, not a 200-line rewrite of a hand-tested feature. |
| "The test is hard to write — must be the wrong abstraction." | Test difficulty is genuinely a signal of design problems. | True at the limit, but "hard to write" sometimes just means the case is genuinely complex and the test deserves the work. Treating every hard-to-test case as an architectural smell becomes an excuse to skip tests on actual complexity. | Distinguish: does the test require setting up 10 mocks (architectural smell) vs is the assertion logic complex (legitimate complexity)? Skip the test only in the first case, and only after writing down the architectural concern in the spec or a follow-up. |
| "I'll write one big integration test instead of 10 unit tests." | Integration tests cover more in fewer lines. | One big test that covers 10 cases is one big test that fails opaquely when any of the 10 break. The failure message says "the integration test is red"; you spend 30 minutes finding which case. Ten unit tests that each cover one case fail with the case name in the report. | Write one unit test per case. Use integration tests for cross-component behavior, not as a substitute for unit-level coverage. |
| "I'll mock everything — it'll be fast." | Speed of test runs matters; mocks are how you get there. | Over-mocking produces tests that pass while the integration is broken. The test exercised your mock; the production code exercises a real database, a real HTTP client, a real clock — and they don't match the mock. The fast-but-wrong test is worse than no test because it provides false confidence. | Mock external services (HTTP, DB, third-party APIs) with named contract assertions. Don't mock language primitives, your own modules, or anything within the unit you're testing. Time-skew tests deserve a fake clock, not a real one. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | A test name in `it <verb>s <subject> when <condition>` form | "I'll figure out what to test as I write." |
| End of Step 2 | Failing test code + red runner output (paste) | "I wrote a test; it should fail." |
| End of Step 3 | Passing test + green runner output (paste) + full-suite output | "Tests pass on my machine." |
| End of Step 4 | Post-refactor green output (paste) | "I cleaned things up." |
| End of Step 5 | All acceptance criteria covered by named tests | "Coverage is good." |

If the runner output isn't pasted somewhere in the PR or scratch artifact, you have
not satisfied this skill.

## Red Flags

- The red test failed because of an import error, missing file, or syntax issue.
  You wrote a test that doesn't run — fix it before claiming red.
- The implementation is more than 30 lines for a single red→green cycle. The
  test was too broad; split it.
- The test passes on the first run, before you write any implementation. It's
  not testing what you think.
- A "passing" green test contains the literal string the implementation outputs
  (`expect(x).toBe('hello world')` against `return 'hello world'`). It's a
  tautology, not a behavioral check.
- The test mocks the function under test. You're asserting against the mock, not
  the code.
- The PR has 5 commits and zero `test:` commits. The tests were retrofitted.

## References

- Kent Beck, *Test-Driven Development by Example* (Addison-Wesley, 2002),
  Chapter 1 "Multi-Currency Money" — the canonical red-green-refactor example.
  Steps 2-4 of this skill operationalize Beck's loop with strict evidence
  requirements added.
- *Software Engineering at Google*, Wright et al. (O'Reilly, 2020), Chapter 11
  "Testing Overview" and Chapter 12 "Unit Testing" — the test-pyramid framing
  and the case for unit-level coverage as the foundation, used in
  Rationalization rows 5 and 6.
