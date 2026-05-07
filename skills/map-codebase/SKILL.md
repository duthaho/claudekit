---
name: map-codebase
user-invocable: true
description: >
  Use when entering an unfamiliar codebase or area, before making non-trivial changes,
  when onboarding to a new system, or when planning a refactor that touches multiple
  modules. Activate for keywords like "explore", "map", "find where", "trace", "how
  does X work", "what calls Y", "scope of change". Produces an evidence-cited map of
  the relevant area with file:line references for every claim. Always cite the file
  and line you read -- never assert behavior you have not verified by reading.
---

# Map Codebase

## Overview

A methodical exploration workflow that produces an evidence-cited map of a codebase
area. Replaces ad-hoc grep with a disciplined four-step pass: scope, list, read,
diagram. The output is a short artifact you can attach to a plan or design doc —
file paths, line numbers, call directions, and the questions you couldn't answer
from reading. The skill's value is enforcing that every claim about the code is
backed by a specific file:line citation, not a memory or pattern-match. Senior ICs
and tech leads use it to bound the blast radius of a change before they propose it.

## When to Use

- Before writing a plan that touches more than one module
- When inheriting a codebase area you didn't author
- When a teammate asks "how does X work" and you don't have a confident answer with citations
- Before a refactor, to enumerate everything that calls the code you're about to change
- When debugging crosses a boundary you don't fully understand (auth, ORM, framework internals)

## When NOT to Use

- The change is single-file and you've already read the file
- You're modifying code you wrote yourself within the last week
- The "exploration" is really a one-line lookup that `Grep` answers in 5 seconds

## Process

### Step 1: Scope

**Goal:** Pin down what you are mapping and what you explicitly are not.

**Inputs:** A task, plan, or question that triggered the need to explore.

**Actions:**

1. Write one sentence: `I am mapping <X> in order to <Y>.` X is concrete (a feature,
   a module, a request path). Y is the decision the map will support.
2. Write one sentence naming what is **out of scope**: `I am not mapping <Z>.`
   This prevents the exploration from sprawling.
3. Set a time box. 30 minutes for a single feature, 90 minutes for a subsystem.

**Output:** A two-sentence scope statement at the top of your scratch artifact.

### Step 2: List entry points

**Goal:** Enumerate every place execution can enter the area being mapped.

**Inputs:** The scope statement.

**Actions:**

1. Find route handlers, controllers, CLI commands, queue consumers, scheduled jobs,
   or event listeners that touch the area. `Grep` for the framework's routing
   primitives.
2. List each entry point as `<file:line> — <what triggers it>`.
3. If the count exceeds 10, return to Step 1. Your scope is too wide.

**Output:** A bullet list of entry points with file:line citations.

### Step 3: Trace and read

**Goal:** Read the actual code at each entry point and the immediate calls outward,
collecting facts.

**Inputs:** The entry-points list.

**Actions:**

1. For each entry point, read the function body. No skimming — line by line.
2. Note every call out of that function: which module, which function, which
   file:line.
3. Follow each call one level deep. Then stop and decide if you need a second
   level. Most maps don't.
4. Record surprises. Lines that don't do what their name suggests, defensive code
   that hints at a past bug, configuration that controls behavior implicitly.
5. Record questions. Things you couldn't answer from reading — these become the
   "Open" section of the output.

**Output:** A flat list of facts, each in form `<file:line> — <what this code does>`,
plus a short list of open questions.

### Step 4: Diagram and write up

**Goal:** Compress the trace into a single artifact a teammate can read in 3 minutes.

**Inputs:** The trace from Step 3.

**Actions:**

1. Write the artifact in Markdown with these sections:
   - **Scope** (the Step 1 sentences)
   - **Entry points** (the Step 2 list)
   - **Call graph** (a small ASCII diagram or nested bullet list with file:line)
   - **Surprises** (each in form `<file:line> — <what surprised me>`)
   - **Open questions** (each in form `<question> — <where you'd need to look>`)
2. Save it. Even if it's a scratch file in `/tmp`. The artifact is the deliverable.
3. If the map is for a plan or design doc, link it; do not paraphrase it.

**Output:** A Markdown artifact at a known path. Maximum 300 lines.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "I already know how this works." | You may have read this code before. Re-reading feels like wasted time. | Memory drift is real and unsensed. The function you remember was three commits ago; the current version has a different signature, a new branch, or a defensive check that changes behavior. The bugs that hit hardest in unfamiliar areas are usually in the code the engineer was sure they knew. | Read the file at the actual current commit before you cite it. If your memory matches what's there, the read takes 60 seconds. If it doesn't, you just avoided a confident wrong answer in your plan. |
| "Grep is enough — I don't need to read the function." | Grep does locate code. For a one-line lookup, that's the whole job. | Grep tells you *where* something appears, not *what it does*. A function that grep matches on `cache.get` may also delete on cache miss, may wrap a remote call, may log to a different sink. Citing the file:line without reading it is asserting behavior you haven't verified. | After Grep finds the call site, open the file and read the function body. Cite file:line in your map only after reading. |
| "Two levels deep is enough — I don't need to follow further." | Going arbitrarily deep is how exploration sprawls. Time-boxing is correct. | The trap is stopping deep enough to feel productive but not deep enough to answer the actual scope question. If your scope was "what does this endpoint do," and the second level is a generic ORM call, the answer is still incomplete. | Re-read your Step 1 scope sentence. If your current trace doesn't answer the `in order to <Y>` clause, you haven't gone deep enough on the calls that matter. Don't go deeper on calls that don't. |
| "I'll write it up later — let me just keep exploring." | Writing while exploring breaks flow. | "Later" usually means after the next task arrives, by which point the trace is gone from working memory. The map ends up reconstructed from a fuzzy recollection, with citations the engineer "thinks are right." That's the same failure mode as not mapping at all. | Open the artifact file at Step 1 and append as you trace. The artifact is grown, not written at the end. If you finish the trace and the artifact is empty, you're going to write it from memory, badly. |
| "ASCII diagrams are silly — text is fine." | Some maps genuinely don't need a diagram. Pure prose can carry. | A diagram-free writeup of a multi-entry-point system is hard to scan and hard to verify. The reader has to mentally reconstruct the call graph from prose. They won't. They'll skim, miss something, and your map becomes a thing nobody actually used. | If there are 3+ entry points or 2+ modules in the scope, draw the call graph. ASCII is fine. Half the value of mapping is the *picture* in someone else's head, not the prose in yours. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | Two-sentence scope statement at top of artifact | "I'm exploring the auth module." |
| End of Step 2 | Bulleted entry-points list with file:line on every row | "There are a bunch of routes that hit this." |
| End of Step 3 | Flat trace with file:line on every fact | "It looks like the cache is checked first, then the DB." |
| End of Step 4 | Markdown artifact saved at a known path with all 5 sections, ≤300 lines | "I have a good mental model now." |

If the artifact does not exist as a file you could send to a teammate, you have not
mapped the codebase. You have read some code.

## Red Flags

- Your map exceeds 300 lines. Your scope was too wide; return to Step 1.
- More than half the entries in your trace cite the same file. You are reading one
  file, not mapping a system.
- Your "Open questions" section is empty. You either understand everything (rare,
  suspicious) or you stopped recording uncertainty.
- You wrote the artifact in past tense ("I explored…") instead of present tense
  ("This module routes…"). The first version is a journal entry; the second is a
  map a teammate can use.
- A claim in the artifact has no file:line citation. The reader has to take it on
  faith.

## References

- Michael Feathers, *Working Effectively with Legacy Code* (Prentice Hall, 2004),
  Chapter 16 "I Don't Understand the Code Well Enough to Change It" — the
  scratch-refactoring and effect-sketch techniques are the source of the
  diagram-as-deliverable principle in Step 4.
