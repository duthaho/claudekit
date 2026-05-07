---
name: plan-review-experience
user-invocable: true
description: >
  Experience-dimension reviewer for written plans (UX + DX). Use when running
  plan-review or directly when an experience review is wanted. Activate for
  keywords like "UX review", "DX review", "experience review", "error states",
  "API ergonomics", "developer experience", "user states". Scores 5 sub-dimensions
  0-10 covering both end-user experience (information hierarchy, state coverage,
  accessibility) and developer experience (error copy, API/CLI ergonomics, AI-slop
  avoidance). Always cite plan task numbers -- never write generic UX/DX advice.
---

# Plan Review — Experience Dimension

## Overview

The experience-dimension reviewer for `plan-review`. Scores five sub-dimensions:
information hierarchy, state coverage, accessibility, DX ergonomics, and AI-slop
avoidance. UX and DX in one pass reflects that "user" and "developer" are both
human consumers of an interface — what differs is the surface (a screen vs an
API/CLI), not the rigor required. The skill produces scored findings paired
with concrete fixes the plan author can apply. Used by `plan-review`'s orchestrator
in parallel with `plan-review-architecture`.

## When to Use

- Invoked by `plan-review` as one of its two parallel reviewers
- The user wants an experience pass on a plan without the architecture review
- A plan has been edited substantially in user-facing or API-facing areas

## When NOT to Use

- The plan has no user-facing or developer-facing surface (pure internal job;
  experience review will produce noise)
- The change is single-task and the experience implications are obvious

## Process

### Step 1: Pre-read

**Goal:** Identify the surfaces the plan touches.

**Inputs:** The plan file. Optionally: the spec, existing UI mockups, or API specs.

**Actions:**

1. Read the spec and plan.
2. Identify each user-facing or developer-facing surface in the plan: screens,
   modals, error states, API endpoints, CLI flags, config keys, log lines, error
   messages, docs.
3. For each, note: who consumes this, in what context, with what level of
   familiarity.

**Output:** A surfaces inventory: `<surface> — <consumer> — <context>`.

### Step 2: Score the five sub-dimensions

**Goal:** 5 scores with cited findings.

**Inputs:** The plan and the surfaces inventory.

**Actions:** For each sub-dimension below, score 0-10 and write at least one
finding citing a plan task or section.

1. **Information hierarchy (0-10)**
   - For each user-facing surface: does the plan name what's primary, secondary,
     tertiary?
   - Does the plan say what the user sees first?
   - Score 10 = hierarchy is unambiguous from the plan.
   - Score 5 = the plan describes what's *on* a screen but not what's emphasized.
   - Score 0 = the plan lists features without ordering.

2. **State coverage (0-10)**
   - For each surface: does the plan address loading, empty, error, partial,
     and success states?
   - Are state transitions named (what happens after submit, after timeout)?
   - Score 10 = all five state types named per surface.
   - Score 5 = success and error covered; loading/empty/partial assumed.
   - Score 0 = only the success state is described.

3. **Accessibility (0-10)**
   - Keyboard navigation paths named?
   - Screen reader semantics specified (ARIA labels, headings)?
   - Color/contrast not the only carrier of meaning?
   - Localization/RTL support flagged where applicable?
   - For non-UI surfaces: is the API/CLI usable by an automation that doesn't
     have human eyes (parseable output, exit codes)?
   - Score 10 = accessibility is named per surface, not assumed.
   - Score 5 = some surfaces named, others assumed-accessible.
   - Score 0 = accessibility is unmentioned and the plan visibly precludes it.

4. **DX ergonomics (0-10)**
   - Error messages for developers: do they say what went wrong AND what to do?
   - API/CLI: are arguments named in the convention of the project?
   - Defaults: does the plan name them?
   - Time-to-hello-world (TTHW): can a new developer get a working call with one
     copy-paste?
   - Score 10 = a developer hitting an error knows the next step from the message.
   - Score 5 = errors are named but copy is generic ("Internal error").
   - Score 0 = errors are uncategorized; debugging requires reading source.

5. **AI-slop avoidance (0-10)**
   - Plan or surface copy doesn't use AI-cliché vocabulary (delve, crucial, robust,
     comprehensive, multifaceted, leverage, harness, unlock, journey, magical,
     seamless, world-class, 10x, pivotal).
   - No emoji bullet decoration.
   - No "Here's the kicker" or "let me break this down" phrasing in user-facing
     text.
   - Headings name the thing, not advertise the experience.
   - Score 10 = copy reads as if a careful engineer wrote it.
   - Score 5 = some slop in user-facing strings, otherwise OK.
   - Score 0 = the plan reads like marketing.

### Step 3: Rank findings as fixes

Same procedure as `plan-review-architecture`'s Step 3. Tag each fix as
`[Blocker]`, `[Important]`, or `[Nice-to-have]`. Cite plan tasks.

A blocker in this dimension is typically: a state type entirely missing for a
user surface (e.g., no error state defined for a submit flow), or an accessibility
gap that would fail a basic audit.

### Step 4: Write the experience report

**Goal:** Hand `plan-review` a clean, paste-ready report.

**Actions:** Produce a Markdown block:

```markdown
## Experience review

- Information hierarchy: X/10 — <one-line justification>
- State coverage: X/10 — <one-line justification>
- Accessibility: X/10 — <one-line justification>
- DX ergonomics: X/10 — <one-line justification>
- AI-slop avoidance: X/10 — <one-line justification>

### Findings

- [Blocker] <finding>; fix: <fix>; cite: <task #>
- [Important] <finding>; fix: <fix>; cite: <task #>
- [Nice-to-have] <finding>; fix: <fix>; cite: <task #>
```

**Output:** The Markdown block.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "Loading and empty states aren't worth flagging — they're obvious." | Most components have default loading spinners and empty-message components, so the assumption is "the framework will handle it." | "The framework will handle it" is what produces a UI where the empty state shows "No items found" with no explanation, no call to action, and no path forward. Defaults are not defaults of *quality*; they're defaults of *existence*. The plan needs to name what the empty state says, not just that one will appear. | Score state coverage on whether the plan *says* what each state shows. If the plan is silent, score it 5 or below and write the finding. |
| "Accessibility is something we'll add later." | Some accessibility work genuinely is post-MVP polish. | "Later" almost never happens because by the time the feature ships, the structure that should have been keyboard-navigable, screen-reader-labeled, and color-independent has hardened. Retrofitting accessibility costs 5-10x more than building it right. | Score accessibility on whether the plan *names* it per surface. "Form is keyboard-navigable; submit on Enter; errors announced via aria-live" takes one line in the plan. If the plan is silent, the implementation will be silent too. |
| "AI-slop is just style — it doesn't affect correctness." | Word choice doesn't change whether code works. | Slop in user-facing copy ("our magical, AI-powered…") signals to the user that the team didn't care enough to write the words a careful engineer would. It also signals to the next maintainer that the bar here is low. The bar set by copy carries through to the bar set by everything else. | Flag every slop instance in the plan. The fix is one-word substitutions ("magical" → drop or replace with a concrete verb). The discipline is uniform across the codebase. |
| "DX error messages: 'Internal error' is fine for now." | Internal errors do happen, and exposing internals is a security concern. | "Internal error" in a developer-facing surface is the line that produces support tickets and Stack Overflow questions. The dev needs to know whether to retry, fix their input, contact support, or give up. "Internal error" answers none of those. | Score DX ergonomics on whether each error tells the dev what to do next. Generic copy is a finding. Fix: write the action ("Retry in 30s" / "Check the input format at <doc-link>" / "Contact support@…"). |
| "Information hierarchy is a designer concern, not the plan's." | The plan describes the work; the designer chooses the layout. | This was true when designers and engineers worked sequentially with specs in between. It's no longer true at the speed plans are written and shipped. The plan that doesn't name what's primary on a surface delegates the call to whoever implements first — and they will pick what's easiest, not what's best. | Score hierarchy on whether the plan says what the user sees first per surface. If the plan names "modal with three tabs" without saying which tab is the default, that's a finding. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | A surfaces inventory: `<surface> — <consumer> — <context>` | "It's a UI plan." |
| End of Step 2 | Five scores 0-10 each paired with at least one cited finding | "UX is good; DX has some gaps." |
| End of Step 3 | Ranked fix list with `[Blocker/Important/Nice]` tags | "Some things to improve." |
| End of Step 4 | The Markdown block in the exact format above | A free-form summary. |

## Red Flags

- Sub-dimension 5 (AI-slop) scores 10 but the plan contains words like "leverage,"
  "seamless," or "delightful." You missed instances; re-read.
- Information hierarchy scores 10 on a plan with no UI mockup, no wireframe, and
  no copy specified. You're guessing.
- DX score is 10 on a plan with no API surface. The dimension doesn't apply; mark
  it `n/a` rather than scoring 10.
- All findings are AI-slop. The reviewer is fixated on copy and missed the
  structural issues.
- The plan has zero error states named and the score is above 5. Re-score.

## References

- Steve Krug, *Don't Make Me Think* (New Riders, 3rd ed. 2014), Chapter 1
  "Don't make me think!" — the principle of obviousness operationalizes into the
  information-hierarchy and state-coverage sub-dimensions.
- *Web Content Accessibility Guidelines (WCAG) 2.1* (W3C, 2018) — the citation
  standard for sub-dimension 3 (accessibility). Use AA as the default conformance
  level when scoring.
