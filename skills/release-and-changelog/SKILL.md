---
name: release-and-changelog
user-invocable: true
description: >
  Use when cutting a release, bumping a version, or writing release notes.
  Activate for keywords like "release", "version bump", "changelog", "release
  notes", "tag", "publish", "ship a release", "v1.x", "v2.x". Enforces version
  hygiene: SemVer respect, changelog discipline, atomic commits, tagged release.
  Always reflect the actual diff in the changelog -- never write notes from
  memory or marketing copy.
---

# Release and Changelog

## Overview

A workflow for cutting a clean release: bump the version, write changelog
entries that reflect the actual diff, tag, publish. The skill exists because
the most common release-time failure isn't the publishing mechanism — it's the
changelog that says "various improvements" or "performance enhancements"
without naming what changed. Users reading the notes can't decide whether to
upgrade; engineers debugging six months later can't bisect on the release.
This skill enforces that the changelog is built from the diff, not from a
remembered list of features. Used after `code-review-loop` and before
publishing/tagging.

## When to Use

- Cutting a numbered release (`v1.2.0`, `v2.0.0-rc1`, etc.)
- Updating a `CHANGELOG.md` after a feature merge in projects with a
  rolling-changelog policy
- Bumping a package version in a published library
- Writing release notes for a deploy that crosses a version boundary

## When NOT to Use

- Continuous-deployment projects with no version concept (every merge is a
  deploy; there's no release event)
- Internal services where deploys don't carry version semantics for consumers
- A trivial doc-only or test-only change (changelog entry optional per
  project policy)

## Process

### Step 1: Determine the version bump

**Goal:** Pick the correct SemVer level.

**Inputs:** The set of changes since the last release.

**Actions:**

1. List every change since the last tag: `git log <last-tag>..HEAD --oneline`.
2. Classify each change:
   - **Breaking** (incompatible API change, removed feature, changed behavior
     that callers depend on) → MAJOR bump
   - **New feature** (additive, backward-compatible) → MINOR bump
   - **Bug fix or internal improvement** (no behavioral change for callers) →
     PATCH bump
3. The bump is the **highest** classification across all changes. One breaking
   change in a release of 50 fixes is still a MAJOR bump.
4. If the project is pre-1.0 (`0.x.y`), treat MINOR as breaking-allowed and
   PATCH as the conservative bump. The 0.x.y SemVer license to break is real
   but should still be exercised consciously.

**Output:** The new version number, with the rationale: `v1.2.0 → v1.3.0
(MINOR: added X feature, no breaking changes)`.

### Step 2: Build the changelog from the diff

**Goal:** A `CHANGELOG.md` entry built from actual changes, not memory.

**Inputs:** The change list from Step 1.

**Actions:**

1. Open `CHANGELOG.md`. If it doesn't exist, create one following Keep a
   Changelog (keepachangelog.com) format.
2. Add a section at the top: `## [<version>] - <YYYY-MM-DD>`.
3. Below it, add subheadings as needed:
   - `### Added` (new features)
   - `### Changed` (changes to existing functionality)
   - `### Deprecated` (features marked for removal)
   - `### Removed` (deleted features)
   - `### Fixed` (bug fixes)
   - `### Security` (vulnerability fixes)
4. For each change in your Step 1 list, write one entry under the right
   subheading. Each entry:
   - Names what changed in user-observable terms (not implementation terms).
   - Cites the PR or commit hash.
   - Names the consumer impact if non-trivial (migration step, removed feature,
     etc.).
5. **Reflect the actual diff.** If you wrote "Improved performance" without
   naming what was improved, return to the diff and find the specific
   improvement.

**Output:** A `CHANGELOG.md` entry that reads like the diff, not like marketing
copy.

### Step 3: Update the manifest

**Goal:** Bump the version where the package's tools look for it.

**Inputs:** The new version number from Step 1.

**Actions:**

1. Update the version in every manifest the project uses:
   - `package.json` (Node)
   - `pyproject.toml` / `setup.py` (Python)
   - `Cargo.toml` (Rust)
   - `plugin.json` / `marketplace.json` (Claude Code plugin)
   - `VERSION` file (where applicable)
2. If the project has a generated build artifact embedding the version
   (`__version__` constant, build banner), regenerate it.
3. Confirm all manifests show the same version. Drift here is a common bug.

**Output:** All version manifests aligned to the new version.

### Step 4: Atomic release commit

**Goal:** One commit that captures the release.

**Inputs:** Updated manifests + updated CHANGELOG.

**Actions:**

1. Stage the manifest changes and the CHANGELOG entry.
2. Commit with a message that names the version and the level:
   `Release v1.3.0 (MINOR)` or follow project convention.
3. The commit should contain *only* the version bump and the changelog. No
   feature changes, no fixes, no "while I was here" cleanups. Atomic.

**Output:** A single release commit on the release branch (or main, depending
on the project's branching model).

### Step 5: Tag and publish

**Goal:** Make the release discoverable to consumers.

**Inputs:** The release commit.

**Actions:**

1. Tag the commit: `git tag -a v1.3.0 -m "v1.3.0 (MINOR): added X feature"`.
2. Push the tag: `git push origin v1.3.0`.
3. If the project publishes to a registry (npm, PyPI, crates.io, marketplace),
   run the publish command. Verify the published artifact matches the tag.
4. If a release notes mechanism exists (GitHub Releases, etc.), copy the
   CHANGELOG entry to it. Don't paraphrase; the changelog and the release notes
   should match.
5. If there's a deploy associated with the release, trigger it now (or follow
   the project's deploy procedure).

**Output:** Tagged, published release. Tag matches the version; published
artifact matches the tag.

### Step 6: Post-release verification

**Goal:** Confirm consumers can actually consume the release.

**Inputs:** A published release.

**Actions:**

1. Install the released artifact in a clean environment (a fresh container,
   a separate venv, a sandboxed install). Don't test from your dev box.
2. Run a smoke check: import the package, run a hello-world, hit the new
   feature.
3. If the install fails or the smoke check breaks, the release is wrong even
   though it's tagged. Yank/unpublish if the registry supports it; otherwise
   ship a patch release.

**Output:** A confirmation that the release works for a fresh consumer.

## Rationalizations

| Excuse | Why it sounds reasonable | Why it's wrong | What to do instead |
|---|---|---|---|
| "It's just a patch — I don't need to write changelog entries for every fix." | Patch releases are routine. Per-fix entries can feel like ceremony. | The changelog is a contract with consumers. A patch with no entries reads as "no notable changes" — but the consumer who runs `npm update` and gets a regression has no way to bisect on the release notes because the notes are empty. The 60 seconds of writing the entry buys hours of debuggability later. | Write one entry per fix. Even one line ("Fixed off-by-one in pagination — #234"). The cost is small; the value is durable. |
| "The diff is small — I can write the changelog from memory." | A small diff really is reconstructable from memory. | Memory drifts in even short timescales. The PR you wrote yesterday already has details (the exact behavior change, the constraint you handled) that aren't in your head today. The changelog written from memory says "improved X" instead of "X now respects Y under condition Z," which is the actual content the consumer needs. | Build the changelog from `git log <last-tag>..HEAD`. Even for small diffs. The 30 seconds of running the command and reading the commits is the discipline. |
| "Nobody reads changelogs anyway." | Some consumers really don't read changelogs. Auto-update bots upgrade silently. | "Nobody reads them" is true until someone debugs a regression and bisects on releases. The changelog is the bisect index. The empty changelog turns "which release introduced this?" into a manual diff comparison; the populated changelog turns it into a 30-second read. | Write the changelog for the future debugger, not for the casual reader. The audience is the engineer six months from now who needs to know what changed in v1.3.0. |
| "I'll bump the version after I publish — the registry will tell me what to use." | Some registries do auto-increment. Letting the tool decide feels efficient. | Auto-increment doesn't know your SemVer intent. A breaking change auto-bumped as PATCH ships under a version consumers will pick up by default — they get the breaking change without warning. The version is your communication; only you know what the changes mean. | Bump the version *before* publishing. Step 1 → Step 3 in this skill. The version reflects intent, not just sequence. |
| "I'll skip the post-release smoke check — CI tested everything." | CI does run the test suite. | CI tests the source tree, not the published artifact. A package that builds and tests fine in CI may publish broken because of a missing file in the package manifest, an unset environment variable in the publish step, or a registry-specific transformation that broke something. The smoke check on a fresh install catches the published-vs-source gap. | Run the smoke check (Step 6). Fresh container, install from registry, run the basic flow. 5 minutes; it catches the class of bugs CI cannot. |
| "I'll batch multiple unrelated fixes into one release commit." | Fewer commits is cleaner. | The release commit is the bisect target; a clean release commit (only the bump and changelog) is bisect-friendly. Mixing fixes into the release commit ties the release to the unrelated fixes — `git revert` of the release commit reverts the fixes too. | Land fixes in their own commits before the release. The release commit only contains the version bump and changelog. Atomic in Step 4 means atomic. |

## Evidence Requirements

| Checkpoint | Required artifact | What "no evidence" looks like |
|---|---|---|
| End of Step 1 | Version bump rationale: `<old> → <new> (<level>: <reason>)` | "Bumping the version." |
| End of Step 2 | Changelog entries built from `git log` output, not memory | "Various improvements." |
| End of Step 3 | All manifests show the same version | "Updated package.json." |
| End of Step 4 | An atomic release commit with only manifest + changelog changes | A release commit that also includes feature fixes. |
| End of Step 5 | Tag pushed; published artifact verified to match tag | "Tagged it." |
| End of Step 6 | Smoke check output from a fresh-install environment | "I'll trust it." |

## Red Flags

- The changelog entry for a release is "Various improvements and bug fixes."
  Build it from the diff.
- A MAJOR-level change (breaking) is in a MINOR release. Either the change
  isn't actually breaking or the release is mis-leveled.
- The release commit contains code changes other than version bump + changelog.
  Re-do as atomic.
- Manifests disagree on the version. Pick one and align them all.
- The git tag doesn't match the published artifact's version. Yank or correct.
- The smoke check was skipped. The release is unverified.
- The CHANGELOG file was force-edited to remove an entry. Releases shouldn't be
  rewritten retroactively.

## References

- Tom Preston-Werner, *Semantic Versioning 2.0.0* (semver.org, 2013) — the
  canonical reference for MAJOR/MINOR/PATCH semantics. Step 1 operationalizes
  the SemVer rules with explicit classification.
- Olivier Lacan & contributors, *Keep a Changelog 1.1.0* (keepachangelog.com) —
  the format used in Step 2's subheading structure (Added, Changed, Deprecated,
  Removed, Fixed, Security).
