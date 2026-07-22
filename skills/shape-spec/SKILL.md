---
name: shape-spec
user-invocable: true
description: >
  Use when starting a non-trivial feature, change, or refactor before any plan or
  code is written. Activate for keywords like "spec", "shape", "what should we
  build", "requirements", "design this", "we need to", "let's add". Produces a
  written spec covering goals, non-goals, constraints, acceptance criteria, and
  open questions. Engineering-flavored — does not chase founder framings like
  demand reality, wedge focus, or 10x outcomes.
---

# Shape Spec

## Overview

A short structured workflow that turns a vague request ("we need to add X") into a
written spec that can be reviewed and planned against. The skill exists because the
most expensive engineering bug is the wrong feature shipped well — and the second
most expensive is the right feature with a missing constraint nobody wrote down.
A spec is not a plan; it does not answer "how." It answers what, why, and what's
out of bounds. The deliverable is a one-to-three page Markdown document a teammate
can read in 5 minutes and sign off on, or push back against. Used before any plan
is written.

## When to Use

- A feature has been discussed informally and someone needs to write it down
- Multiple stakeholders disagree on scope and you need a shared text to argue against
- The change touches more than one module or service (multi-team coordination)
- A previous attempt at this work was abandoned or shipped wrong, and you're not
  sure why
- You're about to start `/claudekit:write-plan` and realize you can't define
  acceptance criteria yet

## When NOT to Use

- The change is one-line, single-file, single-author
- A spec already exists; you should be reviewing it, not rewriting it
- You're in the middle of debugging — debugging produces a fix, not a spec.
  Use `/claudekit:investigate-root-cause`.

## Process

### Step 0: Size the change

**Goal:** Scale the ceremony to the change before spending it. A full spec on a
one-line fix trains people to skip the whole discipline; no spec on a multi-module
change is how the missing constraint ships.

**Actions:**

1. Classify the change (when unsure between two tiers, pick the smaller and say so
   — the plan contract upgrades it later if the work grows):
   - **Trivial** — one-line / single-file / describable in one sentence. **Stop
     here — no spec.** Make the change, then go straight to `verification-gate`
     and `code-review-loop`.
   - **Small** — one focused change, ≤ ~3 files, design obvious. **Skip the spec**
     and hand off to `write-plan` for a lightweight inline plan; `plan-review` is
     optional at this tier.
   - **Standard** — multi-file, multi-session, or real design decisions. Continue
     to Step 1 and write the full spec.
2. Whatever the tier, the evidence never scales to zero: `verification-gate` runs
   and `code-review-loop` reviews any shipped diff. Ceremony is what scales, not
   the gate. (Full tier table: README "Sizing the work".)

**Output:** The chosen tier, stated out loud, and — for Trivial/Small — the handoff
to the right next step instead of a spec.

### Step 1: One-line summary

**Goal:** Force the spec into a single sentence before any further work.

**Inputs:** A feature request, ticket, conversation, or vague need.

**Actions:**

1. Write the spec's title and a single sentence below it: `This spec proposes
   <X> so that <Y>.` X is concrete (a behavior, an artifact). Y is the engineering
   outcome (not the business outcome — leave that to product docs).
2. If you cannot write the sentence in one try, the request is too vague. Ask the
   requester one clarifying question. Don't fill in the X and Y with assumptions.

**Output:** The title and the one-sentence summary at the top of the spec file.

### Step 2: Goals and non-goals

**Goal:** Bound the work explicitly.

**Inputs:** The Step 1 summary.

**Actions:**

1. Write a `## Goals` section. 3-7 bullets. Each goal is a concrete, observable
   outcome — something you could write a test for, even if you won't.
2. Write a `## Non-Goals` section. 3-5 bullets. Each non-goal is a thing a
   reasonable reader might assume is in scope but is not.
3. The non-goals list is more important than the goals list. Goals expand naturally
   in conversation; non-goals only get pinned down when you write them.

**Output:** Two bulleted sections.

### Step 3: Constraints

**Goal:** List every external requirement the implementation must respect.

**Inputs:** The goals from Step 2 plus your knowledge of the existing system.

**Actions:**

1. Write a `## Constraints` section grouped under sub-headings:
   - **Compatibility** — APIs, schemas, protocols that must not break
   - **Performance** — latency budgets, throughput floors, payload sizes
   - **Security/Compliance** — auth, data residency, audit logging requirements
   - **Operational** — supported environments, runtime versions, infra dependencies
2. Each constraint is one line, concrete, falsifiable. "Must be performant" is
   not a constraint. "p95 latency under 200ms at 1k RPS" is.
3. If you can't answer a constraint, mark it `OPEN` and put it in Step 5's
   open questions instead of guessing.

**Output:** A constraints section with at least one entry under each subheading
(or `None` explicitly stated).

### Step 4: Acceptance criteria

**Goal:** Define "done" in terms a tester could check.

**Inputs:** The goals and constraints.

**Actions:**

1. Write `## Acceptance Criteria` as a numbered list.
2. Each criterion is in the form `Given <state>, when <action>, then <expected>`
   OR `<observable behavior> is <verifiable measurement>`. No "system should be
   robust"; instead "system handles 10k concurrent connections without dropping
   below p99 < 500ms."
3. At least one criterion per goal. More if a goal has multiple observable
   facets.

**Output:** A numbered list of falsifiable criteria.

### Step 5: Open questions

**Goal:** Surface what you don't know before someone discovers it mid-implementation.

**Inputs:** Honest reflection on the spec.

**Actions:**

1. Write `## Open Questions`. Each question:
   - is concrete enough that someone could answer it,
   - names who is likely to know,
   - states the impact of getting it wrong.
2. If the spec has no open questions, you're not paying enough attention. There
   is always at least one.

**Output:** A list of questions, each with a `who knows` and `impact if wrong`
note.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "We can figure this out as we go." | Some specs really are just-in-time. Over-specifying upfront is a known failure mode. | "Figure it out as we go" is the line said before the implementation reveals a constraint nobody wrote down, scope creeps to cover that constraint, and the work doubles. The cost of writing a 1-page spec is 30 minutes; the cost of discovering the missing constraint at code-review time is the round trip plus a partial rewrite. | If the change touches one file and one author, skip the spec. If it touches more than one of either, the 30 minutes is cheaper than the round trip. |
| "The non-goals are obvious — I don't need to write them down." | Stating the obvious feels condescending in writing. | The non-goals only feel obvious to the spec author. The reviewer who pushes back on "why didn't you also handle X" hasn't read your mind, only your spec. Unwritten non-goals get implemented anyway, doubling the work, or get cut at the end, leaving someone disappointed. | Write the 3-5 non-goals even if they feel obvious. They're not for you; they're for the reviewer who hasn't been in your head. |
| "We'll add tests later — acceptance criteria can be vague for now." | Acceptance criteria do mature during implementation. Premature specificity can lock in the wrong thing. | Vague acceptance criteria are how "done" becomes negotiable. Without falsifiable criteria, the engineer who finishes and the reviewer who signs off are negotiating on vibes. The work merges, then someone discovers the missing case in production. | Write at least one falsifiable criterion per goal. If you can't, the goal isn't concrete enough — fix the goal first. |
| "There are no open questions, this one's clear." | Sometimes a spec really is well-understood. Forcing questions for show is performative. | "No open questions" almost always means "I haven't looked hard enough." Every spec interacts with infra, data, or upstream/downstream systems, each of which has assumptions you haven't audited. The questions are real; you just haven't asked them. | List at least one open question. If you can't find a real one, write down the assumption you're least sure of as a question — "Are we sure component X behaves this way under load?" That assumption is your weakest link. |
| "We don't need a constraints section for an internal tool." | Internal tools are real, and the formality of constraint-writing fits external APIs better. | Internal tools have constraints too — runtime version, deploy environment, who can call them, data sensitivity. Skipping the section because "internal" is how the internal tool ends up using a deprecated runtime, a soon-to-be-removed library, or storing data the org isn't allowed to log. | Write the constraints section. For internal tools, "Compatibility: must run on the org's standard Python 3.11 runtime" and "Security: must not log PII" are short and they matter. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | One-sentence summary in `<X> so that <Y>` form | "It's a feature for the dashboard." |
| End of Step 2 | Goals + Non-Goals sections, both populated | "Goals are obvious from context." |
| End of Step 3 | Constraints section with all four subheadings present | "I'll add constraints if the reviewer asks." |
| End of Step 4 | Acceptance criteria, one falsifiable item per goal | "It should work well." |
| End of Step 5 | At least one open question with who/impact annotations | "Nothing open at this time." |

## Red Flags

- The non-goals list is empty or shorter than 2 items. You haven't bounded the scope.
- A goal cannot map to any acceptance criterion. The goal is too abstract to ship.
- The spec exceeds 3 pages. You are writing a design doc, not a spec. Stop and
  refactor — most of this content belongs in a plan or design doc downstream.
- An acceptance criterion contains words like "should", "performant", "robust",
  "user-friendly". None of these are testable. Replace with measurements.
- The spec is written entirely in passive voice. You are hiding the actor and the
  decision-maker. Rewrite in the voice of the team that will own the work.

## References

- *A Philosophy of Software Design*, John Ousterhout (Yaknyam Press, 2nd ed.
  2021), Chapter 14 "Choosing Names" and the principle "deep modules over wide
  modules" — useful when defining what your spec is and is not. The non-goals
  section operationalizes Ousterhout's "draw the box around the module" advice
  before code is written.
