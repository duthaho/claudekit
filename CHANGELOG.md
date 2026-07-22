# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Effort-scaled discipline across the design-phase spine — a named
  Trivial/Small/Standard tier model so ceremony scales to the change while the
  evidence gate never does. README gains a canonical "Sizing the work" table and
  the non-negotiable rule (`verification-gate` and `code-review-loop` always run,
  any tier); `shape-spec` gains a `Step 0: Size the change` routing gate;
  `write-plan` and `plan-review` declare which tier they belong to; each of the
  three carries a new rationalization against misusing the tier model — skipping
  the evidence gate under an "it's trivial" excuse, or over-applying full ceremony
  to a one-liner

### Added

- `detect-secrets` hook — blocks Write/Edit content containing secret-looking
  material (AWS/GitHub/Slack/Google/Stripe/npm/Anthropic/OpenAI key shapes,
  private-key blocks); precision-first patterns, fail-open (#3)
- `guard-sensitive-files` hook — blocks Write/Edit on `.env` files (templates
  excluded), key material, and credential dotfiles; case-insensitive,
  Windows-path aware (#3)
- Both new hooks installable via `/claudekit:init` (now 5 hooks) (#3)
- `scripts/test-hooks.cjs` — zero-dependency fixture runner for the PreToolUse
  hooks (46 cases) (#3)
- `scripts/validate-plugin.cjs` — lints every skill against the 8-section
  anatomy and checks plugin/marketplace version sync; runs in CI (#1)
- `scripts/token-report.cjs` — token-footprint report for always-loaded
  skill/agent frontmatter with named budgets, enforced in CI via `--check` (#2)
- CI workflow `.github/workflows/validate.yml` running the anatomy and
  token-budget checks on pushes to `main` and PRs (#1, #2)
- `scripts/verify-evidence.cjs` — evidence gate that mechanically checks an
  agent's claimed evidence: resolves `file:line` citations against real
  paths/ranges (`--citations`) and scans `git diff HEAD` for fake-green
  tampering — deleted test files, added test skips, new TODO/FIXME
  (`--tripwires`); loud gate (exit 1 violations, 2 usage/crash). Deliberately
  does not attempt deep test-tamper analysis
- `scripts/verify-evidence-hook.cjs` — fail-open Stop/PostToolUse wrapper that
  surfaces tripwire findings as advisory, never blocking
- `scripts/verify-evidence.cjs --rerun <artifact>` — re-runs the test suite and
  diffs the actual result against the result claimed in an evidence artifact
  (claimed pass but red, or divergent pass/fail counts, fails); verdict is
  ground-truthed from the run's exit code. Command auto-detected (`npm test` /
  `pytest`) or via `--cmd`; `--detect-only` prints the detected command. Not
  wired into the fail-open hook (too heavy per turn)
- `scripts/test-verify-evidence.cjs` — zero-dependency fixture runner for the
  evidence gate (49 cases), run in CI

## [4.0.0] - 2026-05-07

### Verification-first engineering toolkit

Initial release of the verification-first claudekit. Built for senior ICs and
tech leads who already know how to ship and want a workflow that keeps the bar
high without ceremony.

### Skills (15)

A 5-phase spine — **Investigate → Design → Implement → Verify → Ship** — plus
2 setup skills off-spine. All user-invocable as `/claudekit:<name>`.

| Phase | Skills |
|-------|--------|
| Investigate | `investigate-root-cause`, `map-codebase`, `audit-dependencies` |
| Design | `shape-spec`, `write-plan`, `plan-review`, `plan-review-architecture`, `plan-review-experience` |
| Implement | `test-first`, `incremental-shipping` |
| Verify | `verification-gate`, `evidence-driven-debugging` |
| Ship | `code-review-loop`, `release-and-changelog` |
| Setup | `init` |

Every skill has 8 required sections: Frontmatter, Overview, When to Use,
Process, Rationalizations table, Evidence Requirements, Red Flags, References.

### Agents (8)

One specialist per job; each agent has a single dispatcher.

- `planner` — decompose specs into executable plans
- `architect` — architecture-dimension reviewer for plans
- `experience-reviewer` — UX + DX dimension reviewer for plans
- `investigator` — root-cause investigation with evidence chain
- `tester` — design and write tests with red-green discipline
- `code-reviewer` — pre-merge structural review of diffs
- `security-auditor` — OWASP-aligned review of sensitive paths
- `scout` — codebase mapping and dependency audits

### Rationalizations + Evidence Requirements

The headline pattern: every skill names the excuses an engineer makes to skip a
step (verbatim quotes, with steelmanned reasoning, named failure modes, and
concrete alternatives) and the artifact each checkpoint must produce. "It seems
right" is failure; the artifact is required.

### Pre-completion gate

`verification-gate` is the load-bearing skill. Before any "done" claim, it
forces: restate the claim, run named tests with full output, run the negative
path, verify in a non-IDE environment, cross-check the original ask, sign the
gate. Six steps, ~5 minutes.

### Plan-review pipeline

`plan-review` orchestrates two parallel reviewers — `plan-review-architecture`
and `plan-review-experience` — each scoring 5 sub-dimensions 0-10 with cited
findings. Findings consolidate into one ranked fix gate. Catches structural
issues before code.

### Setup wizard

`/claudekit:init` interactively scaffolds:

- **Rules** — API, frontend, migrations, security, testing → `.claude/rules/`
- **Output styles** — 5 native Claude Code output styles ship with the plugin in `output-styles/` (auto-discovered, no init step). Switch via `/config`.
- **Hooks** — auto-format, block-dangerous-commands, notifications → `.claude/hooks/` + `settings.local.json`
- **MCP Servers** — Context7, Sequential, Playwright, Memory, Filesystem → `.mcp.json`

### Voice

Engineering-only. No founder/VC/coaching language. No "ambitious vision," no
"10x outcomes," no "delight." Engineering analogies, real file paths, real
commands. Take a position; state what evidence would change it.
