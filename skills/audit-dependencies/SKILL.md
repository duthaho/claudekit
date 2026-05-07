---
name: audit-dependencies
user-invocable: true
description: >
  Use when investigating dependency bloat, security advisories, supply-chain risk,
  upgrade planning, or before adding a new third-party package. Activate for
  keywords like "deps", "dependencies", "package.json", "requirements.txt",
  "Cargo.toml", "audit", "CVE", "stale package", "do we use", "what depends on",
  "transitive dep". Produces a written audit with import-graph evidence — never
  trust scanner output without verifying call sites.
---

# Audit Dependencies

## Overview

A four-step dependency audit that goes past `npm audit` / `pip-audit` / `cargo audit`
output into the actual import graph. The skill enforces that every claim
("we don't use that import path", "this dep is dead", "this CVE doesn't apply")
is backed by evidence from the code, not from a tool's verdict alone. The audit
produces a list of dependencies with three columns: declared, transitively pulled,
actually called. Anything in column 1 or 2 but not column 3 is a candidate for
removal. Anything called but unpinned, deprecated, or vulnerable is an action item.
Senior ICs use it before adding a new dep, before a major version bump, or after
a CVE lands.

## When to Use

- After a CVE alert from `npm audit`, `pip-audit`, GitHub Dependabot, Snyk, or similar
- Before adding a new third-party package to the project
- Before a major-version upgrade of a framework, ORM, or runtime
- When `node_modules` / `site-packages` / `target` size feels disproportionate
- When evaluating whether a package can be removed
- During quarterly or release-cycle hygiene

## When NOT to Use

- A patch-version bump on a dep you actively use, with no behavioral changes in the
  changelog. Just bump it.
- A dependency you added in this same PR. You know what it does.
- An audit on a deploy artifact you don't own (audit upstream, not the binary).

## Process

### Step 1: Snapshot

**Goal:** Capture the current declared dependency state in a form you can diff later.

**Inputs:** The project's manifest file(s) — `package.json`, `requirements.txt`,
`pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, etc.

**Actions:**

1. Run the ecosystem's lockfile-respecting list command:
   - `npm ls --all` (or `pnpm ls --depth=Infinity`)
   - `pip list --format=json`
   - `cargo tree`
   - `go list -m all`
2. Pipe to a file. Date-stamp it. This is your before-state.
3. Note the count of direct deps and total deps (direct + transitive).

**Output:** A snapshot file at a known path. A two-line note: `<N> direct,
<M> transitive`.

### Step 2: Build the call graph

**Goal:** Determine which declared and transitively-pulled dependencies are
actually imported by your code.

**Inputs:** The snapshot from Step 1 + access to the source tree.

**Actions:**

1. For each direct dependency, search the source tree for imports of it. Use the
   ecosystem's import syntax:
   - JS/TS: `import .* from ['"]<name>['"]` and `require\(['"]<name>['"]\)`
   - Python: `^(from|import) <name>(\.|$| )`
   - Rust: `use <crate>::` and `extern crate <crate>;`
   - Go: literal package path matches
2. Record the count of import sites per dep.
3. **Zero-import direct deps** are candidates for removal. Mark them.
4. For transitive deps that look load-bearing (security-related: jsonwebtoken,
   cryptography, openssl, lodash, requests), check if your code imports them
   directly. If yes, promote to a direct dep so you control its version.

**Output:** A table per dep: `<name> | <declared version> | <import sites>
| <verdict: keep | remove | promote>`.

### Step 3: Cross-check the scanner

**Goal:** Reconcile your import-graph evidence with what `npm audit` /
`pip-audit` / `cargo audit` reports, and decide whether each advisory applies.

**Inputs:** The Step 2 table, plus the output of the ecosystem's audit tool.

**Actions:**

1. Run the audit tool. Capture the full report.
2. For each advisory, look up the affected package in your Step 2 table.
3. **Crucial check:** does your code call the vulnerable function? An advisory on
   a package you import does *not* automatically apply if the vulnerable code path
   is in a sub-module you never reach. Read the advisory; locate the affected
   function; grep your code for it.
4. Classify each advisory:
   - **APPLIES — patch:** vulnerable code path is reachable; upgrade available.
   - **APPLIES — workaround:** vulnerable code path is reachable; no patch yet,
     mitigate at call site.
   - **DOES NOT APPLY:** the vulnerable code path is not reachable from your code.
     Document the proof in the audit artifact.

**Output:** Each advisory annotated with a verdict and a one-line proof
(`<file:line>` showing reach or absence of the vulnerable function).

### Step 4: Write the audit

**Goal:** Produce an artifact with actions, not opinions.

**Inputs:** The Step 2 table and Step 3 advisory verdicts.

**Actions:**

1. Write a Markdown artifact at `docs/audits/deps-<YYYY-MM-DD>.md` with sections:
   - **Snapshot** (Step 1 counts)
   - **Removals** (zero-import direct deps; estimated diff in transitive count)
   - **Promotions** (transitive → direct, with version pin)
   - **Advisory verdicts** (each with proof line)
   - **Action items** (single bulleted list of changes to apply, in order)
2. The action items list is the deliverable. Each item is a concrete change
   ("Remove `lodash` from package.json — 0 import sites in src/. Re-run
   `pnpm install` to verify transitive count drops by N.").
3. Open a PR for the action items. Each PR change links back to the audit.

**Output:** The audit artifact at the dated path, plus a PR (or sequence of PRs)
applying the action items.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "`npm audit` says it's fine, that's enough." | The scanner is the standard tool, it's automated, it sees more than I do. | Scanners report on declared package versions against a CVE database. They do not tell you whether the vulnerable code path is reachable from your code, nor whether a high-severity advisory in a sub-package matters at all. A clean audit can hide real exposure; a noisy audit can list advisories that don't apply. | Run the scanner, but treat its output as input to Step 3, not the conclusion. Each advisory needs a reachability check before you ignore or patch it. |
| "It's just a patch bump, ship it." | SemVer says patch is bug-fix only, no breaking changes. | SemVer is a publishing convention, not a behavioral guarantee. Patch bumps regularly include behavior shifts (changed defaults, tightened validation, dropped Node/Python versions). Skipping a read of the changelog because "it's just a patch" is the line where the regression you'll spend tomorrow debugging gets shipped today. | Read the changelog or release notes for every bump, even patch. 30 seconds of reading saves 3 hours of bisect later. |
| "We don't use that import path." | It's true that not every advisory applies to every consumer. | "We don't use that import path" said *without* the grep that proves it is folklore. The function may be called transitively by another dep you do use. Or it may be called by a code path triggered only in production. The claim is testable; test it. | Step 3, Action 3: find the affected function in the package source, grep your code (and the code of the deps that use it) for the function name. Cite the file:line where you proved absence — or where you found a call. |
| "snyk/dependabot already filed a PR — just merge it." | Automated remediation is a real win. | The bot's PR upgrades the package; it doesn't verify your code still works at the new version, nor that the upgrade actually closes the advisory in your call path. Merging blind means you trust the bot's reachability analysis (it has none) and your CI's coverage (it may not exercise the affected code). | Treat the bot's PR as a draft of Step 4's action item. Run the test suite. Read the changelog. If the changelog mentions a behavior change in code you call, exercise that path manually before merging. |
| "Removing deps is risky — we might need them later." | True for some deps; the cost of removing a useful dep is non-trivial. | "Might need later" without evidence is hoarding. Unused deps still pull transitive deps, still expand the CVE attack surface, still slow installs and CI. The cost of removal is reversible (re-add when actually needed); the cost of leaving them is paid every install. | If the dep has zero import sites in Step 2 and no roadmap item committed to using it within one release cycle, remove it. Note the version in the audit artifact so re-adding the same version is easy. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | Snapshot file with direct/transitive counts | "We have a lot of dependencies." |
| End of Step 2 | Per-dep table with import-site counts and a `keep/remove/promote` verdict | "Most of these look unused, I think." |
| End of Step 3 | Per-advisory verdict with file:line proof of reach/absence | "The high-severity ones are the urgent ones." |
| End of Step 4 | Audit artifact at `docs/audits/deps-<date>.md` plus an action-items PR | "I'll get to the cleanup in the next sprint." |

## Red Flags

- A dep you marked `remove` is removed by the PR but tests still pass and bundle
  size doesn't change. You may have searched for the wrong import name (alias?
  re-export?). Re-grep before merging.
- The audit tool reports a CVE on a dep you marked `remove`. The CVE may be moot,
  but verify removal closes it before declaring done.
- You found a vulnerable function reachable from your code but the package has no
  patch yet. Don't just file an issue — apply a workaround at your call site
  (validation, sandboxing, or wrapping) and document it in the audit.
- More than 30% of direct deps have zero import sites. The project is using a
  dependency manifest as a wishlist. Coordinate with the team before mass removal.
- A scanner says "high severity" on a dep that doesn't appear in your Step 2
  table. The lockfile and the manifest are out of sync. Rebuild the lockfile.

## References

- *Software Engineering at Google*, Wright et al. (O'Reilly, 2020), Chapter 21
  "Dependency Management" — the "diamond dependency problem" and the case for
  reading import graphs over manifest declarations.
