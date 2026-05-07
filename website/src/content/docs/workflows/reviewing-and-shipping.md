---
title: Reviewing & Shipping
description: How Claude Kit handles code review, atomic releases, and changelog discipline.
---

# Reviewing & Shipping

Two workflows: the code-review loop (between author and reviewer) and the release loop (cutting versioned, changelog-backed releases).

## Code review loop

**Triggers on**: "code review", "PR review", "request review", "address comments"

`code-review-loop` covers both ends of the loop — preparing a reviewable PR and acting on feedback rigorously. Six steps:

### Step 1: Prepare the PR

- Title is one verb-led line ("Add idempotency key to charge endpoint", not "Updates").
- Description has these sections: **What** (1-3 sentences), **Why** (spec link, ticket, bug), **How** (design choice if non-obvious), **Verification** (output from `verification-gate`), **Risk + rollback** (if applicable).
- Diff size: if >400 non-trivial lines (excluding tests, generated files, lockfiles), consider splitting. Reviewers won't read; they'll skim and approve.

### Step 2: Dispatch reviewer agents

Before human reviewers spend their time, dispatch the agents:

- `code-reviewer` — structural findings (data flow, error handling, edge cases, complexity, naming)
- `security-auditor` — for sensitive paths only (auth, payments, crypto, sessions, tokens)

Address obvious findings yourself. Note in the PR description that automated reviewers ran.

### Step 3: Receive feedback

Every comment gets one of three responses:

- **Agree + apply** — make the change, reply with the commit hash
- **Disagree + explain** — cite evidence (a test, a constraint, a spec decision); ask if the reasoning resolves the concern
- **Need more context** — ask for clarification

Never silently dismiss a comment. The reviewer will assume you missed it.

### Step 4: Apply changes in coherent commits

- One commit per topic, even if multiple comments contributed.
- Commit message names what changed and references the comment thread.
- Don't squash before re-review unless project policy demands it.

### Step 5: Re-request review

Add a single summary comment: what was addressed, what was pushed back on. Re-request through the platform's mechanism.

### Step 6: Close the loop

- CI green on the *most recent* commit (not the branch tip from when review was requested).
- All comment threads resolved. Unresolved disagreement = don't merge yet.
- Merge using the project's standard method.

## Release and changelog

**Triggers on**: "release", "version bump", "changelog", "tag", "publish"

`release-and-changelog` enforces SemVer hygiene plus diff-built changelogs plus atomic release commits.

### SemVer discipline

Classify each change since the last release:

- **Breaking** (incompatible API change, removed feature) → MAJOR bump
- **New feature** (additive, backward-compatible) → MINOR bump
- **Bug fix or internal improvement** → PATCH bump

The bump is the **highest** classification across all changes. One breaking change in a release of 50 fixes is still a MAJOR bump.

### Changelog from the diff

Open `CHANGELOG.md`. Add a section: `## [<version>] - <YYYY-MM-DD>`. Subheadings as needed: Added, Changed, Deprecated, Removed, Fixed, Security.

For each change in `git log <last-tag>..HEAD`, write one entry. Each entry:

- Names what changed in user-observable terms (not implementation terms).
- Cites the PR or commit hash.
- Names the consumer impact if non-trivial.

**Reflect the actual diff.** "Improved performance" without naming what is a finding; rewrite from the diff.

### Atomic release commit

One commit. Only the version bump and the changelog. No feature changes, no fixes, no "while I was here" cleanups. The release commit is the bisect target; mixing fixes into it ties the release to those fixes.

### Tag and publish

```
git tag -a v1.3.0 -m "v1.3.0 (MINOR): added X feature"
git push origin v1.3.0
```

If the project publishes to a registry (npm, PyPI, crates.io, marketplace), run the publish command. Verify the published artifact matches the tag.

### Post-release smoke check

Install the published artifact in a clean environment (fresh container, separate venv, sandboxed install). Run a smoke check: import the package, run hello-world, hit the new feature. The smoke check catches the published-vs-source gap that CI cannot — missing files in the package manifest, registry transformations, env-var assumptions.

## Supporting skills

| Skill | When it helps |
|-------|---------------|
| `verification-gate` | Mandatory evidence gate before claiming the PR is ready |
| `incremental-shipping` | Vertical slices behind feature flags; the "ship it dark first" pattern |

## Supporting agents

| Agent | Role |
|-------|------|
| `code-reviewer` | Pre-merge structural review |
| `security-auditor` | OWASP-aligned review on sensitive paths |

## Related pages

- [Planning & Building](/workflows/planning-and-building/) — Spec, plan, plan-review, implement
- [Testing & Debugging](/workflows/testing-and-debugging/) — Test-first and root-cause investigation
- [Skills Reference](/reference/skills/) — All 16 skills
