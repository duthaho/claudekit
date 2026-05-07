---
name: verification-gate
user-invocable: true
description: >
  Use before claiming a task, feature, or PR is complete. Activate for keywords
  like "done", "complete", "ready to merge", "ship it", "tests pass", "looks good",
  "fixed". Mandatory pre-completion gate. Refuses to mark anything done without
  evidence: command outputs, test runs, behavioral checks. Always paste the
  evidence -- never assert "it works" without showing it works.
---

# Verification Gate

## Overview

A pre-completion gate that converts the assertion "this is done" into evidence:
the test output, the command run, the behavioral observation. The skill exists
because "done" is a self-reported state and self-reports are wrong roughly half
the time on real changes. The gate is short — five minutes — but it catches the
class of mistake where an engineer claims a fix works after only running tests
in their IDE, only verifying happy-path, only checking a single environment.
This is the load-bearing skill of v4: every other skill funnels through it
before its work is called done.

## When to Use

- Before opening a PR for review
- Before declaring a bug fixed in response to a ticket or incident
- Before checking off an `Acceptance:` line in a plan
- Before pushing to a branch that triggers a deploy
- Whenever you catch yourself thinking "I'm done" — pause and run this gate

## When NOT to Use

- During exploratory work where "done" doesn't apply yet
- Mid-implementation, when the partial work is committed for checkpoint reasons
  but not claimed complete
- For changes already merged and ack'd — the gate is pre-completion, not
  post-completion

## Process

### Step 1: Restate the claim

**Goal:** Make the "done" claim explicit and falsifiable.

**Inputs:** Whatever you were about to call done.

**Actions:**

1. Write one sentence: `I am claiming <X> is complete because <Y>.` X is the
   work; Y is the evidence you intend to show. Don't do anything else until
   you've written it.
2. If Y is "tests pass and the code looks right," return to Step 2 — the
   evidence is too vague.

**Output:** A claim sentence written down (PR description, scratch file, or
comment).

### Step 2: Run the named tests with full output

**Goal:** Prove the tests asserting this work pass, with evidence pasted.

**Inputs:** The list of tests relevant to this work.

**Actions:**

1. Run the project's test command for this scope. Use the exact form from the
   plan's `Acceptance:` line if it exists.
2. Capture the full output, not just "PASSED." The output should show test names
   and a pass count.
3. Run the broader suite for the file or module — confirm no regressions.
4. Paste the output (or a referenced artifact) into the PR / scratch file.

**Output:** Test runner output captured.

### Step 3: Run the negative path

**Goal:** Verify the work doesn't claim to handle cases it doesn't.

**Inputs:** The acceptance criteria.

**Actions:**

1. Identify negative cases: invalid input, missing required field, unauthorized
   user, network failure, empty result, max-size input.
2. For each, exercise it manually or through a test. Capture what happens.
3. The negative path doesn't have to handle every case gracefully — it has to
   fail predictably and visibly. "Crashes the server" is a fail, not a feature.

**Output:** Negative-path observations: each case + what happened + verdict.

### Step 4: Verify in a non-IDE environment

**Goal:** Confirm the work runs outside your editor.

**Inputs:** A way to run the change in a more production-like context.

**Actions:**

1. If a UI: open the running app in a browser and exercise the change. Don't
   skip this just because tests pass.
2. If a CLI: run the binary or script from a fresh shell. Confirm output, exit
   codes, error messages.
3. If a service endpoint: hit it with `curl` or your project's HTTP test tool.
   Confirm response shape, status codes, headers.
4. If a background job: trigger it via the actual job runner, not by calling
   the function directly.
5. Capture the observation.

**Output:** A non-IDE verification: the command run, the result observed.

### Step 5: Cross-check the original ask

**Goal:** Confirm the work satisfies what was actually asked, not what got
implemented.

**Inputs:** The original ticket, plan task, or spec criterion.

**Actions:**

1. Re-read the original. Word for word.
2. List each thing it asked for. For each, write where in the work it was
   addressed.
3. If something was asked for and the work doesn't address it, the work isn't
   done. Either implement it or explicitly defer it (with the deferral
   documented in the PR or follow-up ticket).

**Output:** A short matrix: `<asked for> → <addressed in <location> | deferred
to <follow-up>>`.

### Step 6: Sign the gate

**Goal:** Record that the gate ran.

**Inputs:** All evidence from Steps 2-5.

**Actions:**

1. Add a `## Verification` section to the PR description (or a scratch artifact
   if no PR yet) containing:
   - The Step 1 claim sentence
   - Test output (or link to it)
   - Negative-path observations
   - Non-IDE verification
   - Cross-check matrix
2. Mark the work done only after this section exists.

**Output:** A `## Verification` section in the PR.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "Tests pass — that's enough verification." | A green test suite is the standard signal, automated and trusted. | Tests cover what was tested. The verification gate exists because the cases that hit production are typically the cases tests didn't cover — the negative paths, the production environment quirks, the bits the implementer assumed worked. "Tests pass" is necessary evidence, not sufficient evidence. | Run the tests AND run the negative path AND verify in a non-IDE environment AND cross-check the original ask. The first one alone is what produces the "tests passed but it broke in prod" pattern. |
| "I tested it manually in my IDE — it works." | Manual verification does count as evidence for the cases that have no automated test. | "It works in my IDE" passes Step 4 only for the IDE environment. Production doesn't run in your IDE. The IDE has your env vars, your local DB, your hot-reloaded modules, your debugger attached. The non-IDE run catches the cases where production doesn't have those. | Run the change outside the IDE. A 30-second `curl` from a separate shell catches "I forgot to deploy the migration" and "the env var is only set in my .env" — bugs that aren't catchable from inside the IDE. |
| "The negative path is obvious — invalid input throws an error, that's it." | Many systems do throw on invalid input by default; the language/framework provides this for free. | "Throws an error" doesn't tell the user/caller what went wrong or what to do. The default error message is often `Internal Server Error 500` — useful to no one. The negative path verification isn't asserting that errors happen; it's asserting that the error is *useful* to the consumer. | Exercise the negative case. Read the error the user/caller would actually see. If it's "Internal Server Error" or "undefined is not a function," that's a finding even if the test passes. |
| "I'll do the cross-check in code review — that's what review is for." | Reviewers do verify the work matches the ask. | The reviewer cross-checks against what they remember the ask was, not what was originally written. They don't have time to re-read the original ticket and match it line-by-line; they read the PR and approve based on what looks right. The cross-check belongs in the gate so the reviewer can verify the gate ran, not redo the work. | Step 5 takes 60 seconds. Re-read the ticket, list what was asked, point at where each ask was addressed. The matrix saves the reviewer 5 minutes of context-rebuilding and produces a better review. |
| "I don't need to paste the test output — the CI will run it." | CI is the system of record for test results. | CI runs after the PR is open. The verification gate runs before the PR is open. Skipping the local paste means the PR opens with no evidence, the reviewer waits for CI, and if CI fails the round trip is on the reviewer's calendar instead of yours. The paste is also documentation: in two months, when someone bisects, the PR has the receipt of what was tested. | Paste the output. If the CI later runs the same tests and matches your local output, that's confirmation; if it diverges, that's an environment bug worth knowing about. |
| "It's a small change — the gate is overkill." | Most small changes don't break things; the overhead per small change feels disproportionate. | The gate's overhead is ~5 minutes; the cost of skipping the gate on a "small" change that turned out not to be small is ~hours plus a Slack message of apology. The cases that *feel* small enough to skip the gate include the ones where the small-feeling change had a non-small consequence. | Run the gate. For genuinely tiny changes (typo, comment, single-line config) you can collapse Steps 2-5 into one paste — but don't skip the gate. The discipline is uniform; the per-change cost stays low. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | A claim sentence written in `<X> is complete because <Y>` form | "I'm done with this." |
| End of Step 2 | Test runner output pasted | "Tests pass." |
| End of Step 3 | Negative-path observations: case + observed behavior | "Error handling looks fine." |
| End of Step 4 | Non-IDE run output (curl, browser screenshot, CLI output) | "Works on my machine." |
| End of Step 5 | Cross-check matrix linking asks to addressed locations | "I implemented what was asked." |
| End of Step 6 | A `## Verification` section in the PR with all of the above | "Marked the task done in the tracker." |

## Red Flags

- The Step 1 claim sentence's `<Y>` is "the code looks right." The claim has no
  evidence; the work isn't done.
- Test output is summarized as "all tests pass" without showing the pass count
  or any test names. The summary is hiding the truth.
- Negative path is "we'll handle errors in v2." That's not a verification, that's
  a deferral. Document it as a follow-up if it's intentional; flag it as a gap
  if it's not.
- The non-IDE check was "I ran the same test command in a different terminal."
  That's not a non-IDE check; it's the same env.
- The cross-check matrix has more "deferred" rows than "addressed." The work
  doesn't satisfy the ask; renegotiate the ask before claiming done.
- The verification section says "see CI." CI is for the reviewer; the gate is
  for you, before the reviewer.

## References

- *Site Reliability Engineering*, Beyer et al. (Google, O'Reilly 2016), Chapter
  17 "Testing for Reliability" — the principle "the system must be tested in
  configurations that match production." Step 4 (non-IDE verification)
  operationalizes this for the per-change scale.
- *The Pragmatic Programmer*, Hunt & Thomas (Addison-Wesley, 20th anniversary
  ed. 2019), Topic 25 "How to Balance Resources" — the "test what you ship,
  ship what you tested" principle is the gate's core posture.
